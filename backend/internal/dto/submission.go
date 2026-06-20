package dto

type SubmissionFilter struct {
	Outcome  string `form:"outcome"`
	Category string `form:"category"`
	From     string `form:"from"`
	To       string `form:"to"`
}
