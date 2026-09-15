/**
 * Shared lightweight client-side types + helpers for the Admin Console's
 * PingAuthorize panels (PolicySets / Policies / Rules).
 *
 * Mirrors services/ping-authorize/types.ts's two families:
 *   - Real* : the actual PingAuthorize Policy Manager wire shapes.
 *   - Demo* : the simplified flat shape used by the local demo store.
 * A list endpoint may return either, depending on whether PING_PAP_URL is
 * configured server-side — components use the `isReal*` guards below to
 * render the right fields/actions for whichever shape came back.
 */

export interface CombiningAlgorithm {
  algorithm:
    | "DenyOverrides"
    | "DenyUnlessPermit"
    | "DenyUnlessThreshold"
    | "FirstApplicable"
    | "OnlyOneApplicable"
    | "PermitOverrides"
    | "PermitUnlessDeny";
  evaluateAll?: boolean;
}

export interface EntityRef {
  id: string;
  type: string;
}

export interface RealPolicySet {
  id: string;
  version?: string;
  type: "PolicySet";
  name: string;
  description?: string;
  shared?: boolean;
  disabled?: boolean;
  combiningAlgorithm: CombiningAlgorithm;
  children?: EntityRef[];
}

export interface RealPolicy {
  id: string;
  version?: string;
  type: "Policy";
  name: string;
  description?: string;
  shared?: boolean;
  disabled?: boolean;
  combiningAlgorithm: CombiningAlgorithm;
  children?: EntityRef[];
}

export type RuleEffectType =
  | "unconditionalPermit"
  | "unconditionalDeny"
  | "conditionalPermitElseDeny"
  | "conditionalDenyElsePermit";

export interface RealRule {
  id: string;
  version?: string;
  type: "Rule";
  name: string;
  description?: string;
  shared?: boolean;
  disabled?: boolean;
  effectSettings: { type: RuleEffectType; condition?: string };
}

export interface PolicyCondition {
  id: string;
  attributePath: string;
  operator: "equals" | "contains" | "in" | "not_equals" | "exists";
  value?: string;
}

export interface DemoPolicySet {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "published" | "disabled";
  createdAt?: string;
  lastModified?: string;
}

export interface DemoPolicy {
  id: string;
  policySetId: string;
  name: string;
  description?: string;
  effect: "Permit" | "Deny";
  status: "draft" | "published" | "disabled";
  lastModified?: string;
  conditions: {
    subject: PolicyCondition[];
    resource: PolicyCondition[];
    action: PolicyCondition[];
    environment: PolicyCondition[];
  };
}

export type AnyPolicySet = RealPolicySet | DemoPolicySet;
export type AnyPolicy = RealPolicy | DemoPolicy;

export function isRealPolicySet(x: AnyPolicySet): x is RealPolicySet {
  return "combiningAlgorithm" in x;
}

export function isRealPolicy(x: AnyPolicy): x is RealPolicy {
  return "combiningAlgorithm" in x;
}

export const COMBINING_ALGORITHMS: CombiningAlgorithm["algorithm"][] = [
  "DenyOverrides",
  "PermitOverrides",
  "FirstApplicable",
  "OnlyOneApplicable",
  "DenyUnlessPermit",
  "PermitUnlessDeny",
  "DenyUnlessThreshold",
];

export const RULE_EFFECT_TYPES: RuleEffectType[] = [
  "unconditionalPermit",
  "unconditionalDeny",
  "conditionalPermitElseDeny",
  "conditionalDenyElsePermit",
];

export const RULE_EFFECT_LABEL: Record<RuleEffectType, string> = {
  unconditionalPermit: "Always Permit",
  unconditionalDeny: "Always Deny",
  conditionalPermitElseDeny: "Permit if condition, else Deny",
  conditionalDenyElsePermit: "Deny if condition, else Permit",
};
