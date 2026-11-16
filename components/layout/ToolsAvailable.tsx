"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Clock3, Wrench } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAccountContext } from "@/context/AccountContext";
import { Button } from "@/components/ui/button";
import type { AvailableTool } from "@/lib/crm/availableTools";

export function ToolsAvailable() {
  const { user } = useAuth();
  const { selectedAccount } = useAccountContext();
  const accountId = selectedAccount?.accountId;
  const [tools, setTools] = useState<AvailableTool[]>([]);
  const [loadedAccountId, setLoadedAccountId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (!accountId || !user?.id) return;
    fetch(`/api/tools-available?accountId=${encodeURIComponent(accountId)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load tools");
        return response.json() as Promise<{ tools: AvailableTool[] }>;
      })
      .then((data) => {
        setTools(data.tools);
        setLoadedAccountId(accountId);
        setError(false);
        setSelected([]);
        setRequestOpen(false);
        setSuccess(false);
        setExpandedToolId(null);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadedAccountId(accountId);
          setError(true);
        }
      });
    return () => controller.abort();
  }, [accountId, user?.id]);

  const currentTools = loadedAccountId === accountId ? tools : [];
  const visible = currentTools.filter((tool) => tool.status !== "Requestable");
  const requestable = currentTools.filter((tool) => tool.status === "Requestable");

  function submitRequest() {
    if (!selected.length) return;
    setTools((previous) => previous.map((tool) => selected.includes(tool.id) ? { ...tool, status: "Pending" } : tool));
    setSelected([]);
    setRequestOpen(false);
    setSuccess(true);
  }

  return (
    <section aria-label="Tools Available" className="border-t border-gray-200 pt-6">
      <div className="mb-4 flex items-center gap-2">
        <Wrench className="h-5 w-5 text-[#C8102E]" />
        <h2 className="text-lg font-semibold text-gray-900">Tools Available</h2>
      </div>
      {!accountId ? (
        <p className="text-sm text-gray-500">Select a Sold-To account to view tools.</p>
      ) : loadedAccountId !== accountId ? (
        <p role="status" className="text-sm text-gray-500">Loading tools...</p>
      ) : error ? (
        <p role="alert" className="text-sm text-red-700">Tools could not be loaded for this account.</p>
      ) : (
        <>
          {visible.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((tool) => (
                tool.status === "Approved" ? (
                  tool.url ? (
                    <a key={tool.id} href={tool.url} target="_blank" rel="noopener noreferrer" className="flex min-h-24 items-start justify-between gap-3 rounded-md border border-gray-200 bg-white p-4 transition-colors hover:border-[#C8102E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C8102E]">
                      <span><strong className="block text-sm text-gray-900">{tool.name}</strong><span className="mt-1 block text-xs text-gray-500">{tool.description}</span></span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[#C8102E]" />
                    </a>
                  ) : (
                    <button key={tool.id} type="button" aria-expanded={expandedToolId === tool.id} onClick={() => setExpandedToolId((current) => current === tool.id ? null : tool.id)} className="flex min-h-24 items-start justify-between gap-3 rounded-md border border-gray-200 bg-white p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C8102E]">
                      <span><strong className="block text-sm text-gray-900">{tool.name}</strong><span className="mt-1 block text-xs text-gray-500">{tool.description}</span>{expandedToolId === tool.id && <span className="mt-2 block text-xs text-gray-600">Approved. No launch URL is configured for this tool.</span>}</span>
                      <Check className="h-4 w-4 shrink-0 text-green-600" />
                    </button>
                  )
                ) : (
                  <div key={tool.id} aria-disabled="true" className="flex min-h-24 items-start justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 opacity-80">
                    <span><strong className="block text-sm text-gray-900">{tool.name}</strong><span className="mt-1 block text-xs text-amber-800">Pending Approval</span></span>
                    <Clock3 className="h-4 w-4 shrink-0 text-amber-700" />
                  </div>
                )
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">No approved or pending tools for this account.</p>}

          {success && <p role="status" className="mt-4 text-sm text-green-700">Access request submitted. Selected tools are now pending approval in this view.</p>}
          <Button className="mt-5" variant="outline" onClick={() => { setRequestOpen((open) => !open); setSuccess(false); }}>
            Request Access
          </Button>
          {requestOpen && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Request tools</h3>
              {requestable.length ? (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {requestable.map((tool) => (
                      <label key={tool.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 bg-white p-3 text-sm hover:border-gray-400">
                        <input type="checkbox" className="mt-0.5 accent-[#C8102E]" checked={selected.includes(tool.id)} onChange={() => setSelected((previous) => previous.includes(tool.id) ? previous.filter((id) => id !== tool.id) : [...previous, tool.id])} />
                        <span><strong className="block text-gray-900">{tool.name}</strong><span className="text-xs text-gray-500">{tool.description}</span></span>
                      </label>
                    ))}
                  </div>
                  <Button className="mt-4 bg-[#C8102E] hover:bg-[#a00e24]" disabled={!selected.length} onClick={submitRequest}>Request Access ({selected.length})</Button>
                </>
              ) : <p className="text-sm text-gray-500">No additional tools available for this account.</p>}
            </div>
          )}
        </>
      )}
    </section>
  );
}