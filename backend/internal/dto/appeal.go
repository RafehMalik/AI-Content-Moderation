package dto

type CreateAppealRequest struct {
	SubmissionID string `json:"submissionId" binding:"required"`
	Reason       string `json:"reason"       binding:"required"`
}

type ReviewAppealRequest struct {
	Status        string `json:"status"        binding:"required"` // Accepted | Rejected
	AdminResponse string `json:"adminResponse"`
}
