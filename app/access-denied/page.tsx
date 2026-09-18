/**
 * /access-denied — canonical route unauthorized page/route access redirects to.
 */

import { Suspense } from "react";
import { AccessDeniedScreen } from "@/components/permissions/AccessDeniedScreen";

export default function AccessDeniedPage() {
  return (
    <Suspense fallback={null}>
      <AccessDeniedScreen />
    </Suspense>
  );
}
