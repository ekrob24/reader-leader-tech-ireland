/**
 * Generated-schema compatible declarations for the Reader Leader `public` schema.
 *
 * Source of truth: `supabase/migrations/*.sql`. The hosted CLI generation path is
 * intentionally documented in the adjacent README because the sandbox has no
 * Supabase personal access token or Docker daemon. Keep this file in the exact
 * shape emitted by `supabase gen types typescript --schema public`.
 */

export type ReaderLeaderRole = "school_admin" | "literacy_lead" | "teacher_set" | "content_steward" | "guardian" | "learner";
export type SessionStatus = "CREATED" | "UPLOADING" | "ANALYSING" | "READY" | "BLOCKED" | "FAILED";
export type DecisionAction = "PROMPT" | "MODEL" | "STAY_SILENT" | "ESCALATE";
export type ConsentStatus = "ACTIVE" | "WITHDRAWN" | "EXPIRED" | "PENDING_DELETION" | "DELETED";
export type WithdrawalReason = "WITHDRAWAL_OF_CONSENT" | "RETENTION_OBJECTION" | "ACCOUNT_CLOSURE" | "OTHER";
export type DeletionScope = "AUDIO_AND_DERIVED_DATA";
export type DeletionRequestStatus = "REQUESTED" | "PROCESSING" | "COMPLETED" | "BLOCKED" | "FAILED";
export type DeletionTargetKind = "AUDIO_ASSET" | "DERIVED_DATA";
export type DeletionReceiptOutcome = "DELETED" | "NOT_FOUND" | "BLOCKED";
export type LifecycleAuditAction = "GUARDIAN_CONSENT_RECORDED" | "GUARDIAN_CONSENT_WITHDRAWN" | "DATA_DELETION_REQUESTED" | "AUDIO_DELETION_VERIFIED" | "DERIVED_DATA_DELETION_VERIFIED";
export type ContentReviewAction = "DRAFT_CREATED" | "RIGHTS_CLEARED" | "RIGHTS_BLOCKED" | "SAFETY_PASSED" | "SAFETY_BLOCKED" | "APPROVED" | "RETIRED";
export type MockUploadStatus = "NOT_STARTED" | "UPLOADED" | "BLOCKED";
export type MockAnalysisJobStatus = "QUEUED" | "RUNNING" | "READY" | "FAILED" | "RETRYING" | "BLOCKED";
export type MockTraceStage = "SESSION_CONSENT_CHECKED" | "MOCK_UPLOAD_RECORDED" | "ANALYSIS_QUEUED" | "ANALYSIS_STARTED" | "EVIDENCE_COMPOSED" | "POLICY_GATE_PASSED" | "ANALYSIS_READY" | "ANALYSIS_RETRYING" | "ANALYSIS_BLOCKED";

type NoRelationships = [];

export interface Database {
  public: {
    Tables: {
      organisations: {
        Row: { id: string; name: string; region: string; created_at: string };
        Insert: { id?: string; name: string; region?: string; created_at?: string };
        Update: { id?: string; name?: string; region?: string; created_at?: string };
        Relationships: NoRelationships;
      };
      memberships: {
        Row: { user_id: string; organisation_id: string; role: ReaderLeaderRole };
        Insert: { user_id: string; organisation_id: string; role: ReaderLeaderRole };
        Update: { user_id?: string; organisation_id?: string; role?: ReaderLeaderRole };
        Relationships: NoRelationships;
      };
      learners: {
        Row: { id: string; organisation_id: string; display_name: string; pronunciation_set_id: string; safe_label: string; created_at: string };
        Insert: { id?: string; organisation_id: string; display_name: string; pronunciation_set_id: string; safe_label: string; created_at?: string };
        Update: { id?: string; organisation_id?: string; display_name?: string; pronunciation_set_id?: string; safe_label?: string; created_at?: string };
        Relationships: NoRelationships;
      };
      consents: {
        Row: { id: string; learner_id: string; guardian_id: string; purpose: string; training_opt_in: false; retention_until: string; withdrawn_at: string | null; status: ConsentStatus; consent_text_version: string; policy_version: string; idempotency_key: string; created_at: string };
        Insert: { id?: string; learner_id: string; guardian_id: string; purpose: string; training_opt_in?: false; retention_until: string; withdrawn_at?: string | null; status?: ConsentStatus; consent_text_version: string; policy_version: string; idempotency_key: string; created_at?: string };
        Update: { id?: string; learner_id?: string; guardian_id?: string; purpose?: string; training_opt_in?: false; retention_until?: string; withdrawn_at?: string | null; status?: ConsentStatus; consent_text_version?: string; policy_version?: string; idempotency_key?: string; created_at?: string };
        Relationships: NoRelationships;
      };
      guardian_learner_links: {
        Row: { guardian_id: string; learner_id: string; organisation_id: string; relationship_label: string; created_at: string };
        Insert: { guardian_id: string; learner_id: string; organisation_id: string; relationship_label?: string; created_at?: string };
        Update: { guardian_id?: string; learner_id?: string; organisation_id?: string; relationship_label?: string; created_at?: string };
        Relationships: NoRelationships;
      };
      consent_withdrawals: {
        Row: { id: string; consent_id: string; learner_id: string; guardian_id: string; reason: WithdrawalReason; idempotency_key: string; requested_at: string };
        Insert: { id?: string; consent_id: string; learner_id: string; guardian_id: string; reason: WithdrawalReason; idempotency_key: string; requested_at?: string };
        Update: never;
        Relationships: NoRelationships;
      };
      data_deletion_requests: {
        Row: { id: string; learner_id: string; guardian_id: string; organisation_id: string; scope: DeletionScope; status: DeletionRequestStatus; idempotency_key: string; requested_at: string; completed_at: string | null };
        Insert: { id?: string; learner_id: string; guardian_id: string; organisation_id: string; scope: DeletionScope; status?: DeletionRequestStatus; idempotency_key: string; requested_at?: string; completed_at?: string | null };
        Update: { status?: DeletionRequestStatus; completed_at?: string | null };
        Relationships: NoRelationships;
      };
      audio_assets: {
        Row: { id: string; learner_id: string; organisation_id: string; storage_key: string | null; storage_object_hash: string; sha256: string; retention_until: string; deleted_at: string | null; deletion_request_id: string | null; created_at: string };
        Insert: { id?: string; learner_id: string; organisation_id: string; storage_key?: string | null; storage_object_hash: string; sha256: string; retention_until: string; deleted_at?: string | null; deletion_request_id?: string | null; created_at?: string };
        Update: { storage_key?: string | null; deleted_at?: string | null; deletion_request_id?: string | null };
        Relationships: NoRelationships;
      };
      derived_data_assets: {
        Row: { id: string; learner_id: string; organisation_id: string; source_audio_asset_id: string | null; asset_kind: "SPEECH_ASSESSMENT" | "ALIGNMENT" | "DECISION_TRACE"; storage_key: string | null; storage_object_hash: string | null; retention_until: string; deleted_at: string | null; deletion_request_id: string | null; created_at: string };
        Insert: { id?: string; learner_id: string; organisation_id: string; source_audio_asset_id?: string | null; asset_kind: "SPEECH_ASSESSMENT" | "ALIGNMENT" | "DECISION_TRACE"; storage_key?: string | null; storage_object_hash?: string | null; retention_until: string; deleted_at?: string | null; deletion_request_id?: string | null; created_at?: string };
        Update: { storage_key?: string | null; deleted_at?: string | null; deletion_request_id?: string | null };
        Relationships: NoRelationships;
      };
      data_deletion_receipts: {
        Row: { id: string; request_id: string; target_kind: DeletionTargetKind; target_reference_hash: string; outcome: DeletionReceiptOutcome; verified_at: string };
        Insert: { id?: string; request_id: string; target_kind: DeletionTargetKind; target_reference_hash: string; outcome: DeletionReceiptOutcome; verified_at?: string };
        Update: never;
        Relationships: NoRelationships;
      };
      data_lifecycle_audit_events: {
        Row: { id: string; organisation_id: string; learner_id: string; guardian_id: string | null; deletion_request_id: string | null; action: LifecycleAuditAction; created_at: string };
        Insert: { id?: string; organisation_id: string; learner_id: string; guardian_id?: string | null; deletion_request_id?: string | null; action: LifecycleAuditAction; created_at?: string };
        Update: never;
        Relationships: NoRelationships;
      };
      passages: {
        Row: { id: string; organisation_id: string; title: string; body: string; version: number; region_tags: string[]; phonics_profile: Json; approval_status: "DRAFT" | "APPROVED" | "RETIRED"; rights_status: "UNREVIEWED" | "CLEARED" | "BLOCKED"; safety_status: "UNREVIEWED" | "PASSED" | "BLOCKED"; approved_at: string | null; approved_by: string | null; creation_idempotency_key: string; created_at: string };
        Insert: { id?: string; organisation_id: string; title: string; body: string; version?: number; region_tags?: string[]; phonics_profile?: Json; approval_status?: "DRAFT" | "APPROVED" | "RETIRED"; rights_status?: "UNREVIEWED" | "CLEARED" | "BLOCKED"; safety_status?: "UNREVIEWED" | "PASSED" | "BLOCKED"; approved_at?: string | null; approved_by?: string | null; creation_idempotency_key: string; created_at?: string };
        Update: { id?: string; organisation_id?: string; title?: string; body?: string; version?: number; region_tags?: string[]; phonics_profile?: Json; approval_status?: "DRAFT" | "APPROVED" | "RETIRED"; rights_status?: "UNREVIEWED" | "CLEARED" | "BLOCKED"; safety_status?: "UNREVIEWED" | "PASSED" | "BLOCKED"; approved_at?: string | null; approved_by?: string | null; creation_idempotency_key?: string; created_at?: string };
        Relationships: NoRelationships;
      };
      content_review_events: {
        Row: { id: string; passage_id: string; organisation_id: string; reviewer_id: string; action: ContentReviewAction; idempotency_key: string; created_at: string };
        Insert: { id?: string; passage_id: string; organisation_id: string; reviewer_id: string; action: ContentReviewAction; idempotency_key: string; created_at?: string };
        Update: never;
        Relationships: NoRelationships;
      };
      mock_session_uploads: {
        Row: { id: string; session_id: string; upload_status: MockUploadStatus; file_name: string; media_type: "audio/webm" | "audio/wav"; byte_size: number; idempotency_key: string; created_at: string };
        Insert: { id?: string; session_id: string; upload_status?: MockUploadStatus; file_name: string; media_type: "audio/webm" | "audio/wav"; byte_size: number; idempotency_key: string; created_at?: string };
        Update: { upload_status?: MockUploadStatus };
        Relationships: NoRelationships;
      };
      mock_analysis_jobs: {
        Row: { id: string; session_id: string; status: MockAnalysisJobStatus; attempt_count: number; trace_id: string; idempotency_key: string; created_at: string; updated_at: string };
        Insert: { id?: string; session_id: string; status?: MockAnalysisJobStatus; attempt_count?: number; trace_id?: string; idempotency_key: string; created_at?: string; updated_at?: string };
        Update: { status?: MockAnalysisJobStatus; attempt_count?: number; updated_at?: string };
        Relationships: NoRelationships;
      };
      mock_analysis_trace_events: {
        Row: { id: string; trace_id: string; session_id: string; stage: MockTraceStage; safe_summary: string; created_at: string };
        Insert: { id?: string; trace_id: string; session_id: string; stage: MockTraceStage; safe_summary: string; created_at?: string };
        Update: never;
        Relationships: NoRelationships;
      };
      reading_sessions: {
        Row: { id: string; organisation_id: string; learner_id: string; passage_id: string; status: SessionStatus; idempotency_key: string; demo_mode: boolean; started_at: string | null; completed_at: string | null; created_at: string };
        Insert: { id?: string; organisation_id: string; learner_id: string; passage_id: string; status?: SessionStatus; idempotency_key: string; demo_mode?: boolean; started_at?: string | null; completed_at?: string | null; created_at?: string };
        Update: { id?: string; organisation_id?: string; learner_id?: string; passage_id?: string; status?: SessionStatus; idempotency_key?: string; demo_mode?: boolean; started_at?: string | null; completed_at?: string | null; created_at?: string };
        Relationships: NoRelationships;
      };
      evidence_bundles: {
        Row: { id: string; session_id: string; word_event_id: string; token_index: number; reference_word: string; observed_form: string | null; event_type: string; audio_confidence: number; alignment_confidence: number; lexical_confidence: number; pronunciation_confidence: number; pronunciation_context: "VALID_REGIONAL_VARIANT" | "NOT_MATCHED" | "UNCERTAIN"; self_correction_detected: boolean; pause_before_intervention_ms: number; evidence_refs: string[]; provider: string; provider_version: string; policy_version: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["evidence_bundles"]["Row"], "id" | "created_at" | "observed_form" | "self_correction_detected" | "pause_before_intervention_ms"> & { id?: string; created_at?: string; observed_form?: string | null; self_correction_detected?: boolean; pause_before_intervention_ms?: number };
        Update: Partial<Database["public"]["Tables"]["evidence_bundles"]["Row"]>;
        Relationships: NoRelationships;
      };
      agent_decisions: {
        Row: { id: string; session_id: string; word_event_id: string; action: DecisionAction; event_type: string; reason_code: string; confidence: number; evidence_refs: string[]; teacher_note: string; policy_version: string; trace_id: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["agent_decisions"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["agent_decisions"]["Row"]>;
        Relationships: NoRelationships;
      };
      human_reviews: {
        Row: { id: string; agent_decision_id: string; reviewer_id: string; override_action: DecisionAction; reason: string; idempotency_key: string; created_at: string };
        Insert: { id?: string; agent_decision_id: string; reviewer_id: string; override_action: DecisionAction; reason: string; idempotency_key: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["human_reviews"]["Row"]>;
        Relationships: NoRelationships;
      };
      audit_events: {
        Row: { id: string; actor_type: string; actor_id: string | null; action: string; resource: string; before_json: Json | null; after_json: Json | null; trace_id: string | null; created_at: string };
        Insert: { id?: string; actor_type: string; actor_id?: string | null; action: string; resource: string; before_json?: Json | null; after_json?: Json | null; trace_id?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["audit_events"]["Row"]>;
        Relationships: NoRelationships;
      };
      learner_safety_decisions: {
        Row: { id: string; learner_id: string; organisation_id: string; action: "PROMPT" | "ENCOURAGE" | "STAY_SILENT"; status: "PROPOSED" | "OVERRIDDEN" | "REVERSED"; summary: string; override_id: string | null; created_at: string };
        Insert: { id?: string; learner_id: string; organisation_id: string; action: "PROMPT" | "ENCOURAGE" | "STAY_SILENT"; status?: "PROPOSED" | "OVERRIDDEN" | "REVERSED"; summary: string; override_id?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["learner_safety_decisions"]["Row"]>;
        Relationships: NoRelationships;
      };
      learner_safety_events: {
        Row: { id: string; learner_id: string; organisation_id: string; actor_id: string; event_type: "OVERRIDE_CREATED" | "OVERRIDE_REVERSED"; summary: string; idempotency_key: string; created_at: string };
        Insert: { id?: string; learner_id: string; organisation_id: string; actor_id: string; event_type: "OVERRIDE_CREATED" | "OVERRIDE_REVERSED"; summary: string; idempotency_key: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["learner_safety_events"]["Row"]>;
        Relationships: NoRelationships;
      };
      reader_leader_actor_links: {
        Row: { manus_open_id: string; supabase_user_id: string; created_at: string };
        Insert: { manus_open_id: string; supabase_user_id: string; created_at?: string };
        Update: { manus_open_id?: string; supabase_user_id?: string; created_at?: string };
        Relationships: NoRelationships;
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_org_member: { Args: { target_org: string }; Returns: boolean };
      has_role: { Args: { target_org: string; allowed: ReaderLeaderRole[] }; Returns: boolean };
    };
    Enums: { app_role: ReaderLeaderRole; session_status: SessionStatus; action: DecisionAction; consent_status: ConsentStatus; withdrawal_reason: WithdrawalReason; deletion_scope: DeletionScope; deletion_request_status: DeletionRequestStatus; deletion_target_kind: DeletionTargetKind; deletion_receipt_outcome: DeletionReceiptOutcome; lifecycle_audit_action: LifecycleAuditAction; content_review_action: ContentReviewAction; mock_upload_status: MockUploadStatus; mock_analysis_job_status: MockAnalysisJobStatus; mock_trace_stage: MockTraceStage };
    CompositeTypes: { [_ in never]: never };
  };
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
