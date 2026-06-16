/**
 * GET /api/admin/permit-policy
 *
 * Fetches roles, resources, and role-permission assignments from Permit.io.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateRequest, authErrorResponse } from "@/lib/api/validateRequest";

const PERMIT_API = "https://api.permit.io/v2";

interface PermitRole {
  key: string;
  name: string;
  description?: string;
  permissions?: string[];
}

interface PermitResource {
  key: string;
  name: string;
  actions: Record<string, { name?: string; description?: string }>;
}

interface PermitRoleAssignment {
  role: string;
  resource: string;
  actions: string[];
}

export async function GET(req: NextRequest) {
  try {
    const { session, userContext } = await validateRequest(req);

    if (userContext.user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const apiKey = process.env.PERMIT_API_KEY;
    if (!apiKey || apiKey.startsWith("permit_key_demo")) {
      return NextResponse.json({
        roles: [],
        resources: [],
        assignments: [],
        source: "unavailable",
        message: "Permit.io API key not configured",
      });
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    // Fetch project & environment info from the API key
    // The Permit.io API key encodes the project/env context
    const projKey = process.env.PERMIT_PROJECT_KEY ?? "default";
    const envKey = process.env.PERMIT_ENV_KEY ?? "dev";

    const [rolesRes, resourcesRes] = await Promise.all([
      fetch(`${PERMIT_API}/schema/${projKey}/${envKey}/roles`, { headers }),
      fetch(`${PERMIT_API}/schema/${projKey}/${envKey}/resources`, { headers }),
    ]);

    if (!rolesRes.ok || !resourcesRes.ok) {
      // Try to get error details
      const rolesErr = !rolesRes.ok ? await rolesRes.text() : "";
      const resErr = !resourcesRes.ok ? await resourcesRes.text() : "";
      console.error("[Permit API] Roles error:", rolesErr);
      console.error("[Permit API] Resources error:", resErr);
      return NextResponse.json({
        roles: [],
        resources: [],
        assignments: [],
        source: "error",
        message: `Permit.io API error: roles=${rolesRes.status}, resources=${resourcesRes.status}`,
      });
    }

    const roles: PermitRole[] = await rolesRes.json();
    const resources: PermitResource[] = await resourcesRes.json();

    // Build role-permission assignments from the permissions array in each role
    const assignments: PermitRoleAssignment[] = [];

    for (const role of roles) {
      const perms = role.permissions ?? [];
      const byResource = new Map<string, string[]>();
      for (const perm of perms) {
        const [resource, action] = perm.split(":");
        if (!byResource.has(resource)) byResource.set(resource, []);
        byResource.get(resource)!.push(action);
      }
      for (const [resource, actions] of Array.from(byResource.entries())) {
        assignments.push({ role: role.key, resource, actions });
      }
    }

    return NextResponse.json({
      roles: roles.map((r) => ({ key: r.key, name: r.name, description: r.description })),
      resources: resources
        .filter((r) => r.key !== "__user")
        .map((r) => ({
          key: r.key,
          name: r.name,
          actions: Object.keys(r.actions),
        })),
      assignments,
      source: "permit.io",
    });
  } catch (error) {
    const { message, status } = authErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
