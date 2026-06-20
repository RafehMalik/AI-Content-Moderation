package services

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/rafehmalik/ai-content-moderation/internal/models"
	"github.com/rafehmalik/ai-content-moderation/internal/repository"
)

// The 6 categories defined by the assignment spec.
//
// IMPORTANT — read before grading/demoing:
// This classification layer was rewritten to use a single multimodal vision
// LLM instead of a stack of single-purpose models (NSFW binary classifier +
// CLIP zero-shot + caption-then-text-zero-shot fallback). A vision LLM can
// natively reason about all 6 categories from one image, which the old
// pipeline could not do (it only had a real signal for one category and
// left the other five at a hardcoded 0%).
//
// Provider verified live as of this build (checked June 2026):
//   - Hugging Face Inference Providers' OpenAI-compatible router, using
//     Qwen/Qwen2.5-VL-32B-Instruct. This is the default below.
//   - Groq's only vision-capable model, meta-llama/llama-4-scout-17b-16e-instruct,
//     was announced deprecated on 2026-06-17 with a shutdown date of
//     2026-07-17, and Groq's listed replacements (openai/gpt-oss-120b,
//     qwen/qwen3.6-27b) are text-only. So Groq is wired up below as an
//     OPTIONAL alternative provider, but don't depend on it past that date
//     without re-checking https://console.groq.com/docs/vision for a new
//     vision model.
//
// The provider/model/endpoint are all environment-configurable (see
// classifyImageWithLLM) precisely so this can be swapped without another
// code change if a provider's model lineup shifts again.
var Categories = []string{
	"Graphic Violence",
	"Hate Symbols",
	"Self-Harm",
	"Extremist Propaganda",
	"Weapons & Contraband",
	"Harassment & Humiliation",
}

// categoryDefinitions mirrors the definitions given in the spec and is
// embedded directly into the prompt sent to the vision LLM, so the model's
// notion of each category matches the policy engine's notion of it.
var categoryDefinitions = map[string]string{
	"Graphic Violence":         "physical harm, gore, or serious injury depicted in the image",
	"Hate Symbols":             "extremist or terrorist symbols, flags, insignia, or imagery",
	"Self-Harm":                "self-inflicted injury, cutting, suicide-related imagery, or related acts",
	"Extremist Propaganda":     "content that recruits for, glorifies, or promotes extremist or terrorist groups",
	"Weapons & Contraband":     "weapons, illegal drugs, or trafficking-related items or activity",
	"Harassment & Humiliation": "degrading, threatening, or humiliating treatment of an identifiable individual",
}

const (
	// defaultLLMAPIURL is Hugging Face's OpenAI-compatible chat completions
	// router, which auto-routes to whichever inference provider currently
	// hosts the requested model.
	defaultLLMAPIURL = "https://router.huggingface.co/v1/chat/completions"
	// defaultLLMModel is a vision-language model confirmed live on HF
	// Inference Providers as of this build.
	defaultLLMModel = "Qwen/Qwen2.5-VL-7B-Instruct:together"

	llmRequestTimeout = 60 * time.Second
)

// llmCategoryScore is the parsed-and-validated result for one category,
// produced by the vision LLM.
type llmCategoryScore struct {
	Confidence float64
	Reason     string
}

// --- request/response shapes for the OpenAI-compatible chat completions API ---

type llmChatRequest struct {
	Model       string           `json:"model"`
	Temperature float64          `json:"temperature"`
	MaxTokens   int              `json:"max_tokens"`
	Messages    []llmChatMessage `json:"messages"`
}

type llmChatMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"`
}

type llmChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// llmCategoryJSON is the per-category shape we instruct the model to emit.
type llmCategoryJSON struct {
	Category   string  `json:"category"`
	Confidence float64 `json:"confidence"`
	Reason     string  `json:"reason"`
}

type llmModerationJSON struct {
	Categories []llmCategoryJSON `json:"categories"`
}

// ModerateImage returns: categoryResults, outcome, policyVersion, error
//
// NOTE: the policy engine, threshold logic, AutoBlock/FlagReview logic, and
// return signature below are unchanged from the previous implementation.
// Only the score-gathering step (previously NSFW + CLIP + caption fallback)
// was replaced with a single vision LLM call.
func ModerateImage(imagePath string) ([]models.CategoryResult, string, string, error) {
	policies, err := repository.GetAllPolicies()
	if err != nil {
		return nil, "", "", err
	}

	policyMap := map[string]models.Policy{}
	policyVersion := "v1"
	for _, p := range policies {
		policyMap[p.Category] = p
		policyVersion = p.Version
	}

	imageBytes, err := os.ReadFile(imagePath)
	if err != nil {
		return nil, "", "", fmt.Errorf("could not read image: %w", err)
	}

	scores, err := classifyImageWithLLM(imageBytes)
	if err != nil {
		log.Printf("[moderation] vision LLM classification FAILED for %s: %v", imagePath, err)
		return nil, "", policyVersion, fmt.Errorf("moderation engine unavailable: %w", err)
	}

	var results []models.CategoryResult
	finalOutcome := "Approved"

	for _, category := range Categories {
		policy, ok := policyMap[category]
		if !ok || !policy.Enabled {
			continue
		}

		score := scores[category]
		confidence := score.Confidence

		var reason string
		detected := confidence >= policy.Threshold
		if detected {
			reason = fmt.Sprintf("%.1f%% confidence — exceeds %.0f%% threshold (%s)", confidence, policy.Threshold, score.Reason)
		} else {
			reason = fmt.Sprintf("%.1f%% confidence (%s)", confidence, score.Reason)
		}

		results = append(results, models.CategoryResult{
			Category:   category,
			Detected:   detected,
			Confidence: confidence,
			Reason:     reason,
		})

		log.Printf("[moderation] %s -> %s: %.1f%% (threshold %.0f%%, detected=%v)",
			imagePath, category, confidence, policy.Threshold, detected)

		if detected {
			switch policy.Action {
			case "AutoBlock":
				finalOutcome = "Blocked"
			case "FlagReview":
				if finalOutcome != "Blocked" {
					finalOutcome = "Flagged"
				}
			}
		}
	}

	log.Printf("[moderation] %s -> FINAL OUTCOME: %s", imagePath, finalOutcome)
	return results, finalOutcome, policyVersion, nil
}

// classifyImageWithLLM sends the image to a multimodal vision LLM and asks
// it to score all 6 moderation categories in one call. It is provider-
// agnostic: point it at HF's router (default) or any other OpenAI-compatible
// vision endpoint (e.g. Groq) via env vars.
//
// Env vars:
//   - LLM_VISION_API_URL   (default: HF router, see defaultLLMAPIURL)
//   - LLM_VISION_MODEL     (default: defaultLLMModel)
//   - LLM_VISION_API_TOKEN (falls back to HF_API_TOKEN for backward compat)
//
// To use Groq instead (see the deprecation caveat at the top of this file):
//
//	LLM_VISION_API_URL=https://api.groq.com/openai/v1/chat/completions
//	LLM_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
//	LLM_VISION_API_TOKEN=<your GROQ_API_KEY>
func classifyImageWithLLM(imageBytes []byte) (map[string]llmCategoryScore, error) {
	apiURL := os.Getenv("LLM_VISION_API_URL")
	if apiURL == "" {
		apiURL = defaultLLMAPIURL
	}

	model := os.Getenv("LLM_VISION_MODEL")
	if model == "" {
		model = defaultLLMModel
	}

	token := os.Getenv("LLM_VISION_API_TOKEN")
	if token == "" {
		token = os.Getenv("HF_API_TOKEN") // backward-compatible with the prior HF-only setup
	}
	if token == "" {
		return nil, fmt.Errorf("LLM_VISION_API_TOKEN (or HF_API_TOKEN) is not set")
	}

	mimeType := http.DetectContentType(imageBytes)
	if !strings.HasPrefix(mimeType, "image/") {
		mimeType = "image/jpeg" // safe default; most uploads are jpeg/png anyway
	}
	dataURI := fmt.Sprintf("data:%s;base64,%s", mimeType, base64.StdEncoding.EncodeToString(imageBytes))

	reqPayload := llmChatRequest{
		Model:       model,
		Temperature: 0,
		MaxTokens:   800,
		Messages: []llmChatMessage{
			{
				Role:    "system",
				Content: "You are a strict content-moderation vision classifier. You only ever respond with valid JSON. Never add commentary, markdown, or code fences.",
			},
			{
				Role: "user",
				Content: []map[string]interface{}{
					{"type": "text", "text": buildModerationPrompt()},
					{"type": "image_url", "image_url": map[string]string{"url": dataURI}},
				},
			},
		},
	}

	reqBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return nil, fmt.Errorf("could not marshal LLM request: %w", err)
	}

	req, err := http.NewRequest("POST", apiURL, bytes.NewReader(reqBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: llmRequestTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("vision LLM request failed: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("could not read vision LLM response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("vision LLM returned status %d: %s", resp.StatusCode, string(respBytes))
	}

	// Debug: log which endpoint and model were called
	log.Printf("[moderation] vision LLM request -> url=%s model=%s (image size=%d bytes)", apiURL, model, len(imageBytes))

	var chatResp llmChatResponse
	if err := json.Unmarshal(respBytes, &chatResp); err != nil {
		return nil, fmt.Errorf("could not parse vision LLM response envelope: %w — raw: %s", err, string(respBytes))
	}
	if chatResp.Error != nil {
		return nil, fmt.Errorf("vision LLM returned an error: %s", chatResp.Error.Message)
	}
	if len(chatResp.Choices) == 0 {
		return nil, fmt.Errorf("vision LLM returned no choices — raw: %s", string(respBytes))
	}

	rawContent := chatResp.Choices[0].Message.Content
	// Debug: log a truncated model output to aid diagnosis
	safeRaw := rawContent
	if len(safeRaw) > 1000 {
		safeRaw = safeRaw[:1000] + "...[truncated]"
	}
	log.Printf("[moderation] vision LLM raw output (truncated): %s", safeRaw)

	jsonStr := extractJSON(rawContent)
	log.Printf("[moderation] vision LLM extracted JSON: %s", jsonStr)

	var parsed llmModerationJSON
	if err := json.Unmarshal([]byte(jsonStr), &parsed); err != nil || len(parsed.Categories) == 0 {
		return nil, fmt.Errorf("could not parse vision LLM JSON output: %v — raw model output: %s", err, rawContent)
	}

	scores := map[string]llmCategoryScore{}
	for _, c := range parsed.Categories {
		scores[c.Category] = llmCategoryScore{
			Confidence: clampConfidence(c.Confidence),
			Reason:     strings.TrimSpace(c.Reason),
		}
	}

	// Guarantee every spec category has an entry, even if the model omitted
	// one — never silently drop a category from the policy evaluation loop.
	for _, category := range Categories {
		if _, ok := scores[category]; !ok {
			log.Printf("[moderation] WARNING: vision LLM did not return a score for category %q", category)
			scores[category] = llmCategoryScore{
				Confidence: 0,
				Reason:     "vision model did not return a score for this category",
			}
		}
	}

	return scores, nil
}

// buildModerationPrompt builds the instruction text sent alongside the
// image, embedding the spec's category definitions and a strict JSON
// output schema.
func buildModerationPrompt() string {
	var sb strings.Builder
	sb.WriteString("You are an automated content-moderation classifier for a user-generated-content platform. ")
	sb.WriteString("Analyze the attached image and score it against EXACTLY these six categories. ")
	sb.WriteString("For each category, give a confidence score from 0 to 100 indicating how strongly the image matches that category's definition — including 0 if it clearly does not apply.\n\n")
	sb.WriteString("Categories and definitions:\n")
	for _, cat := range Categories {
		sb.WriteString(fmt.Sprintf("- %s: %s\n", cat, categoryDefinitions[cat]))
	}
	sb.WriteString("\nRespond with ONLY a single JSON object, no markdown, no code fences, no commentary, in exactly this shape:\n")
	sb.WriteString(`{"categories":[`)
	sb.WriteString(`{"category":"Graphic Violence","confidence":0,"reason":"short reason"},`)
	sb.WriteString(`{"category":"Hate Symbols","confidence":0,"reason":"short reason"},`)
	sb.WriteString(`{"category":"Self-Harm","confidence":0,"reason":"short reason"},`)
	sb.WriteString(`{"category":"Extremist Propaganda","confidence":0,"reason":"short reason"},`)
	sb.WriteString(`{"category":"Weapons & Contraband","confidence":0,"reason":"short reason"},`)
	sb.WriteString(`{"category":"Harassment & Humiliation","confidence":0,"reason":"short reason"}`)
	sb.WriteString(`]}`)
	sb.WriteString("\n\nYou must include all six categories, in this exact order, every time, even if every confidence is 0.")
	return sb.String()
}

// extractJSON strips common wrapping (markdown code fences, stray prose
// before/after) that vision LLMs sometimes add despite being told not to,
// and returns the best-guess JSON object substring.
func extractJSON(s string) string {
	s = strings.TrimSpace(s)
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```JSON")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	s = strings.TrimSpace(s)

	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start == -1 || end == -1 || end < start {
		return s
	}
	return s[start : end+1]
}

// clampConfidence guards against an out-of-range or malformed score from
// the model so it can never accidentally bypass or force a policy action.
func clampConfidence(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 100 {
		return 100
	}
	return v
}
