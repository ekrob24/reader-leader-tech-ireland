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
import { LearnerSelectionInput, TimelinePageInput, OverrideReversalInput } from "@shared/learner-safety-persistence";
import { getLearnerWorkspace, getLearnerTimelinePage, listLearnersForActor, reverseOverride } from "./reader-leader/learner-safety-persistence";

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
    learners: protectedProcedure.query(({ ctx }) => listLearnersForActor(ctx.user.openId)),
    workspace: protectedProcedure.input(LearnerSelectionInput).query(({ ctx, input }) => getLearnerWorkspace(ctx.user.openId, input.learnerId)),
    timeline: protectedProcedure.input(TimelinePageInput).query(({ ctx, input }) => getLearnerTimelinePage(ctx.user.openId, input)),
    reverseOverride: protectedProcedure.input(OverrideReversalInput).mutation(({ ctx, input }) => reverseOverride(ctx.user.openId, input)),
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
        const reviewer = await resolveReviewerContext(ctx.user.openId, organisationId);
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
        const reviewer = await resolveReviewerContext(ctx.user.openId, organisationId);
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
