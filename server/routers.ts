import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { AgentDecision, EvaluationCase } from "@shared/contracts/reader-leader";
import { loadGoldPack } from "./fixtures/evidence-loader";
import { applyRegressionGate, evaluateGoldPack } from "./reader-leader/evaluation";
import { createTeacherBriefing, projectChildSafeFeedback } from "./reader-leader/surfaces";
import { AppendOnlyOverrideInput } from "@shared/contracts/reader-leader";
import { z } from "zod";
import { persistHumanOverride, resolveDecisionOrganisation, resolveReviewerContext } from "./reader-leader/override-persistence";
import { getSupabaseAdminClient } from "./supabase";
import { buildLearnerSafetyOverview } from "@shared/learner-safety";
import { LearnerSelectionInput, TimelinePageInput, OverrideReversalInput, TIMELINE_INTEGRITY_MESSAGE } from "@shared/learner-safety-persistence";
import { getLearnerWorkspace, getLearnerTimelinePage, listLearnersForActor, reverseOverride } from "./reader-leader/learner-safety-persistence";
import { ReaderLeaderContractBoundaryError } from "./reader-leader/contract-boundary";
import { TRPCError } from "@trpc/server";
import { RecordGuardianConsentInput, RequestDataDeletionInput, WithdrawGuardianConsentInput, DataDeletionRequestId } from "@shared/consent-lifecycle";
import { getDeletionStatus, getRetentionEligibility, recordGuardianConsent, requestDataDeletion, withdrawGuardianConsent } from "./reader-leader/consent-lifecycle";
import { ApprovePassageInput, ContentOrganisationInput, CreatePassageDraftInput, RetirePassageInput, SetPassageRightsInput, SetPassageSafetyInput } from "@shared/content-workflow";
import { approvePassage, createPassageDraft, getContentWorkflowOverview, listContentOrganisations, retirePassage, setPassageRights, setPassageSafety } from "./reader-leader/content-workflow";
import { AcknowledgeTeacherSessionAlertInput, CreateHackathonSessionInput, HackathonSessionIdInput, RecordMockUploadInput, ResetHackathonDemoInput, RetryMockAnalysisInput, RunMockAnalysisInput, TeacherSessionHistoryInput } from "@shared/hackathon-session-demo";
import { acknowledgeTeacherSessionAlert, createHackathonSession, getHackathonDemoSummary, getHackathonSession, getTeacherSessionHistory, recordMockUpload, resetHackathonDemoSessions, retryMockAnalysis, runMockAnalysis } from "./reader-leader/hackathon-session-demo";
import { ChildSessionActionInput, ChildSessionTokenInput, LaunchChildSessionInput, TeacherSessionReviewInput } from "@shared/child-reading-journey";
import { completeChildReading, getChildReadingView, getTeacherMockReview, launchChildSession, requestChildHelp, startChildReading } from "./reader-leader/child-reading-journey";

async function readLearnerSafetyData<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ReaderLeaderContractBoundaryError && error.publicCode === "TIMELINE_RECORD_INVALID") {
      throw new TRPCError({ code: "UNPROCESSABLE_CONTENT", message: TIMELINE_INTEGRITY_MESSAGE });
    }
    throw error;
  }
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  learnerSafety: router({
    overview: protectedProcedure.query(({ ctx }) => buildLearnerSafetyOverview(ctx.user.role)),
    learners: protectedProcedure.query(({ ctx }) => listLearnersForActor(ctx.user)),
    workspace: protectedProcedure.input(LearnerSelectionInput).query(({ ctx, input }) => readLearnerSafetyData(() => getLearnerWorkspace(ctx.user, input.learnerId))),
    timeline: protectedProcedure.input(TimelinePageInput).query(({ ctx, input }) => readLearnerSafetyData(() => getLearnerTimelinePage(ctx.user, input))),
    reverseOverride: protectedProcedure.input(OverrideReversalInput).mutation(({ ctx, input }) => reverseOverride(ctx.user, input)),
  }),
  consentLifecycle: router({
    recordGuardianConsent: protectedProcedure.input(RecordGuardianConsentInput).mutation(({ ctx, input }) => recordGuardianConsent(ctx.user, input)),
    withdrawGuardianConsent: protectedProcedure.input(WithdrawGuardianConsentInput).mutation(({ ctx, input }) => withdrawGuardianConsent(ctx.user, input)),
    requestDataDeletion: protectedProcedure.input(RequestDataDeletionInput).mutation(({ ctx, input }) => requestDataDeletion(ctx.user, input)),
    retentionEligibility: protectedProcedure.input(LearnerSelectionInput).query(({ ctx, input }) => getRetentionEligibility(ctx.user, input.learnerId)),
    deletionStatus: protectedProcedure.input(z.object({ requestId: DataDeletionRequestId })).query(({ ctx, input }) => getDeletionStatus(ctx.user, input.requestId)),
  }),
  contentWorkflow: router({
    organisations: protectedProcedure.query(({ ctx }) => listContentOrganisations(ctx.user)),
    overview: protectedProcedure.input(ContentOrganisationInput).query(({ ctx, input }) => getContentWorkflowOverview(ctx.user, input.organisationId)),
    createDraft: protectedProcedure.input(CreatePassageDraftInput).mutation(({ ctx, input }) => createPassageDraft(ctx.user, input)),
    setRights: protectedProcedure.input(SetPassageRightsInput).mutation(({ ctx, input }) => setPassageRights(ctx.user, input)),
    setSafety: protectedProcedure.input(SetPassageSafetyInput).mutation(({ ctx, input }) => setPassageSafety(ctx.user, input)),
    approve: protectedProcedure.input(ApprovePassageInput).mutation(({ ctx, input }) => approvePassage(ctx.user, input)),
    retire: protectedProcedure.input(RetirePassageInput).mutation(({ ctx, input }) => retirePassage(ctx.user, input)),
  }),
  hackathonDemo: router({
    summary: protectedProcedure.input(ContentOrganisationInput).query(({ ctx, input }) => getHackathonDemoSummary(ctx.user, input.organisationId)),
    createSession: protectedProcedure.input(CreateHackathonSessionInput).mutation(({ ctx, input }) => createHackathonSession(ctx.user, input)),
    recordMockUpload: protectedProcedure.input(RecordMockUploadInput).mutation(({ ctx, input }) => recordMockUpload(ctx.user, input)),
    runMockAnalysis: protectedProcedure.input(RunMockAnalysisInput).mutation(({ ctx, input }) => runMockAnalysis(ctx.user, input)),
    retryMockAnalysis: protectedProcedure.input(RetryMockAnalysisInput).mutation(({ ctx, input }) => retryMockAnalysis(ctx.user, input)),
    session: protectedProcedure.input(HackathonSessionIdInput).query(({ ctx, input }) => getHackathonSession(ctx.user, input.sessionId)),
    teacherHistory: protectedProcedure.input(TeacherSessionHistoryInput).query(({ ctx, input }) => getTeacherSessionHistory(ctx.user, input)),
    acknowledgeReview: protectedProcedure.input(AcknowledgeTeacherSessionAlertInput).mutation(({ ctx, input }) => acknowledgeTeacherSessionAlert(ctx.user, input)),
    resetSyntheticSessions: protectedProcedure.input(ResetHackathonDemoInput).mutation(({ ctx, input }) => resetHackathonDemoSessions(ctx.user, input)),
  }),
  childJourney: router({
    launch: protectedProcedure.input(LaunchChildSessionInput).mutation(({ ctx, input }) => launchChildSession(ctx.user, input)),
    teacherReview: protectedProcedure.input(TeacherSessionReviewInput).query(({ ctx, input }) => getTeacherMockReview(ctx.user, input)),
    view: publicProcedure.input(ChildSessionTokenInput).query(({ input }) => getChildReadingView(input)),
    start: publicProcedure.input(ChildSessionActionInput).mutation(({ input }) => startChildReading(input)),
    requestHelp: publicProcedure.input(ChildSessionActionInput).mutation(({ input }) => requestChildHelp(input)),
    complete: publicProcedure.input(ChildSessionActionInput).mutation(({ input }) => completeChildReading(input)),
  }),
  readerLeader: router({
    preview: publicProcedure.query(async () => {
      const pack = await loadGoldPack();
      const evidence = pack.cases[0];
      if (!evidence) throw new Error("Gold pack is empty");
      const decision = AgentDecision.parse({
        action: evidence.goldAction,
        eventType: evidence.eventType,
        reasonCode: `FIXTURE_${evidence.eventType}`,
        confidence: Math.min(evidence.audioConfidence, evidence.alignmentConfidence, evidence.lexicalConfidence, evidence.pronunciationConfidence),
        evidenceRefs: evidence.evidenceRefs,
        teacherNote: "Fixture-backed proposal for review.",
        policyVersion: evidence.policyVersion,
        traceId: `preview-${evidence.id}`,
      });
      const replay = pack.cases.map(item => EvaluationCase.parse({
        id: item.id,
        goldAction: item.goldAction,
        predictedAction: item.goldAction,
        selfCorrectionDetected: item.selfCorrectionDetected,
        predictedInterrupted: false,
        speakerGroup: item.speakerGroup,
      }));
      const report = evaluateGoldPack(replay);
      return {
        evidence,
        decision,
        teacherBriefing: createTeacherBriefing(evidence, decision),
        childFeedback: projectChildSafeFeedback(decision),
        evaluation: applyRegressionGate(report),
      };
    }),
    persistedDecision: protectedProcedure
      .input(z.object({ decisionId: z.string().uuid() }))
      .query(async ({ input, ctx }) => {
        const organisationId = await resolveDecisionOrganisation(input.decisionId);
        const reviewer = await resolveReviewerContext(ctx.user, organisationId);
        const { data, error } = await getSupabaseAdminClient()
          .from("agent_decisions")
          .select("id, session_id, action, event_type, reason_code, confidence, evidence_refs, teacher_note, policy_version, trace_id, created_at")
          .eq("id", input.decisionId)
          .single();
        if (error || !data) throw new Error("Persisted decision was not found");
        return { decision: data, reviewer, organisationId };
      }),
    createOverride: protectedProcedure
      .input(AppendOnlyOverrideInput)
      .mutation(async ({ input, ctx }) => {
        const organisationId = await resolveDecisionOrganisation(input.agentDecisionId);
        const reviewer = await resolveReviewerContext(ctx.user, organisationId);
        return persistHumanOverride(input, reviewer);
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
