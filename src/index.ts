#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const API_BASE =
  process.env["MCP_BUGZILLA_BASE_URL"] ?? "https://bugzilla.mozilla.org/rest"
const API_KEY = process.env["MCP_BUGZILLA_API_KEY"]

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T | null> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }
    if (API_KEY) headers["X-BUGZILLA-API-KEY"] = API_KEY

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
    if (!response.ok) {
      const body = await response.text()
      console.error(`Bugzilla API error ${response.status} ${path}: ${body}`)
      return null
    }
    return (await response.json()) as T
  } catch (e) {
    console.error(`Fetch failed: ${path}`, e)
    return null
  }
}

export const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
})

export const err = (msg: string) => ({
  content: [{ type: "text" as const, text: `Error: ${msg}` }],
})

// ─── Bugs ───

export const getBug = async ({ id }: { id: string }) => {
  const data = await apiFetch<{ bugs: unknown[] }>(`/bug/${id}`)
  return data?.bugs?.[0] ? ok(data.bugs[0]) : err(`bug ${id} not found`)
}

export const searchBugs = async (params: {
  product?: string
  component?: string
  status?: string
  severity?: string
  priority?: string
  assigned_to?: string
  creator?: string
  resolution?: string
  summary?: string
  keywords?: string
  quicksearch?: string
  limit?: number
  offset?: number
}) => {
  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) query.set(k, String(v))
  }
  const data = await apiFetch<{ bugs: unknown[] }>(`/bug?${query}`)
  return data ? ok(data.bugs) : err("search failed")
}

export const createBug = async (params: {
  product: string
  component: string
  summary: string
  version: string
  description?: string
  severity?: string
  priority?: string
  op_sys?: string
  platform?: string
  assigned_to?: string
  cc?: string[]
  keywords?: string[]
  status?: string
  target_milestone?: string
}) => {
  if (!API_KEY) return err("MCP_BUGZILLA_API_KEY is required to create bugs")
  const data = await apiFetch<{ id: number }>("/bug", {
    method: "POST",
    body: JSON.stringify(params),
  })
  return data?.id ? ok({ id: data.id }) : err("failed to create bug")
}

export const updateBug = async (params: {
  id: string
  status?: string
  resolution?: string
  assigned_to?: string
  priority?: string
  severity?: string
  summary?: string
  whiteboard?: string
  keywords?: { add?: string[]; remove?: string[]; set?: string[] }
  cc?: { add?: string[]; remove?: string[] }
  comment?: { body: string; is_private?: boolean }
  dupe_of?: number
}) => {
  if (!API_KEY) return err("MCP_BUGZILLA_API_KEY is required to update bugs")
  const { id, ...fields } = params
  const data = await apiFetch<{ bugs: unknown[] }>(`/bug/${id}`, {
    method: "PUT",
    body: JSON.stringify(fields),
  })
  return data?.bugs ? ok(data.bugs) : err(`failed to update bug ${id}`)
}

export const getBugHistory = async ({ id }: { id: string }) => {
  const data = await apiFetch<{ bugs: unknown[] }>(`/bug/${id}/history`)
  return data?.bugs?.[0] ? ok(data.bugs[0]) : err(`no history for bug ${id}`)
}

// ─── Comments ───

export const getComments = async ({
  id,
  new_since,
}: {
  id: string
  new_since?: string
}) => {
  const query = new_since ? `?new_since=${encodeURIComponent(new_since)}` : ""
  const data = await apiFetch<{ bugs: Record<string, unknown> }>(
    `/bug/${id}/comment${query}`,
  )
  return data?.bugs
    ? ok(data.bugs[id])
    : err(`failed to get comments for ${id}`)
}

export const createComment = async (params: {
  id: string
  comment: string
  is_private?: boolean
  work_time?: number
}) => {
  if (!API_KEY) return err("MCP_BUGZILLA_API_KEY is required to post comments")
  const { id, ...body } = params
  const data = await apiFetch<{ id: number }>(`/bug/${id}/comment`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  return data?.id ? ok({ id: data.id }) : err("failed to create comment")
}

// ─── Attachments ───

export const getAttachments = async ({ id }: { id: string }) => {
  const data = await apiFetch<{ bugs: Record<string, unknown> }>(
    `/bug/${id}/attachment`,
  )
  return data?.bugs
    ? ok(data.bugs[id])
    : err(`failed to get attachments for ${id}`)
}

// ─── Products ───

export const getProducts = async ({
  type,
}: {
  type?: "accessible" | "selectable" | "enterable"
}) => {
  const query = type ? `?type=${type}` : "?type=accessible"
  const data = await apiFetch<{ ids: number[] }>(`/product${query}`)
  return data?.ids ? ok(data.ids) : err("failed to fetch products")
}

export const getProduct = async ({ name }: { name: string }) => {
  const data = await apiFetch<{ products: unknown[] }>(
    `/product/${encodeURIComponent(name)}`,
  )
  return data?.products?.[0]
    ? ok(data.products[0])
    : err(`product "${name}" not found`)
}

// ─── Users ───

export const getUser = async ({ name }: { name: string }) => {
  const data = await apiFetch<{ users: unknown[] }>(
    `/user?names=${encodeURIComponent(name)}`,
  )
  return data?.users?.[0] ? ok(data.users[0]) : err(`user "${name}" not found`)
}

// ─── Fields ───

export const getBugFields = async ({ field_name }: { field_name?: string }) => {
  const query = field_name
    ? `/field/bug/${encodeURIComponent(field_name)}`
    : "/field/bug"
  const data = await apiFetch<{ fields: unknown[] }>(query)
  return data?.fields ? ok(data.fields) : err("failed to fetch bug fields")
}

// ─── Server ───

const server = new McpServer({ name: "mcp-bugzilla", version: "1.0.0" })

server.registerTool(
  "get_bug",
  {
    description: "Fetch a single bug by ID or alias",
    inputSchema: {
      id: z.string().describe("Bug ID or alias"),
    },
  },
  getBug,
)

server.registerTool(
  "search_bugs",
  {
    description:
      "Search Bugzilla bugs with filters. Use quicksearch for full-text queries.",
    inputSchema: {
      product: z.string().optional().describe("Product name (e.g. Firefox)"),
      component: z.string().optional().describe("Component name"),
      status: z
        .string()
        .optional()
        .describe("Bug status (NEW, ASSIGNED, RESOLVED, etc.)"),
      severity: z
        .string()
        .optional()
        .describe(
          "Severity (blocker, critical, major, normal, minor, trivial)",
        ),
      priority: z.string().optional().describe("Priority (P1, P2, P3, P4, P5)"),
      assigned_to: z.string().optional().describe("Assignee email"),
      creator: z.string().optional().describe("Reporter email"),
      resolution: z
        .string()
        .optional()
        .describe("Resolution (FIXED, WONTFIX, DUPLICATE, etc.)"),
      summary: z.string().optional().describe("Text to search in summary"),
      keywords: z.string().optional().describe("Comma-separated keywords"),
      quicksearch: z
        .string()
        .optional()
        .describe("Quicksearch query string (full-text)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .default(20)
        .describe("Max results to return"),
      offset: z.number().int().min(0).optional().describe("Pagination offset"),
    },
  },
  searchBugs,
)

server.registerTool(
  "create_bug",
  {
    description: "Create a new bug. Requires MCP_BUGZILLA_API_KEY.",
    inputSchema: {
      product: z.string().describe("Product name"),
      component: z.string().describe("Component name"),
      summary: z.string().describe("One-line bug summary"),
      version: z.string().describe("Product version affected"),
      description: z.string().optional().describe("Detailed description"),
      severity: z.string().optional().describe("Severity level"),
      priority: z.string().optional().describe("Priority level"),
      op_sys: z.string().optional().describe("Operating system"),
      platform: z.string().optional().describe("Hardware platform"),
      assigned_to: z.string().optional().describe("Assignee email"),
      cc: z.array(z.string()).optional().describe("CC list (emails)"),
      keywords: z.array(z.string()).optional().describe("Keywords"),
      status: z.string().optional().describe("Initial status"),
      target_milestone: z.string().optional().describe("Target milestone"),
    },
  },
  createBug,
)

server.registerTool(
  "update_bug",
  {
    description:
      "Update fields on an existing bug. Requires MCP_BUGZILLA_API_KEY.",
    inputSchema: {
      id: z.string().describe("Bug ID or alias to update"),
      status: z.string().optional().describe("New status"),
      resolution: z.string().optional().describe("Resolution (when closing)"),
      assigned_to: z.string().optional().describe("New assignee email"),
      priority: z.string().optional().describe("New priority"),
      severity: z.string().optional().describe("New severity"),
      summary: z.string().optional().describe("New summary"),
      whiteboard: z.string().optional().describe("Whiteboard text"),
      keywords: z
        .object({
          add: z.array(z.string()).optional(),
          remove: z.array(z.string()).optional(),
          set: z.array(z.string()).optional(),
        })
        .optional()
        .describe("Keyword changes"),
      cc: z
        .object({
          add: z.array(z.string()).optional(),
          remove: z.array(z.string()).optional(),
        })
        .optional()
        .describe("CC list changes"),
      comment: z
        .object({
          body: z.string(),
          is_private: z.boolean().optional(),
        })
        .optional()
        .describe("Comment to attach with the update"),
      dupe_of: z
        .number()
        .int()
        .optional()
        .describe("Mark as duplicate of this bug ID"),
    },
  },
  updateBug,
)

server.registerTool(
  "get_bug_history",
  {
    description: "Get the field-change history for a bug",
    inputSchema: {
      id: z.string().describe("Bug ID or alias"),
    },
  },
  getBugHistory,
)

server.registerTool(
  "get_comments",
  {
    description: "Get all comments for a bug",
    inputSchema: {
      id: z.string().describe("Bug ID or alias"),
      new_since: z
        .string()
        .optional()
        .describe("ISO 8601 datetime — return only comments newer than this"),
    },
  },
  getComments,
)

server.registerTool(
  "create_comment",
  {
    description: "Post a comment on a bug. Requires MCP_BUGZILLA_API_KEY.",
    inputSchema: {
      id: z.string().describe("Bug ID or alias"),
      comment: z.string().describe("Comment text"),
      is_private: z
        .boolean()
        .optional()
        .default(false)
        .describe("Private comment"),
      work_time: z
        .number()
        .optional()
        .describe("Hours worked to log against the bug"),
    },
  },
  createComment,
)

server.registerTool(
  "get_attachments",
  {
    description: "List attachments for a bug",
    inputSchema: {
      id: z.string().describe("Bug ID or alias"),
    },
  },
  getAttachments,
)

server.registerTool(
  "get_products",
  {
    description: "List Bugzilla products",
    inputSchema: {
      type: z
        .enum(["accessible", "selectable", "enterable"])
        .optional()
        .default("accessible")
        .describe("Filter by product type"),
    },
  },
  getProducts,
)

server.registerTool(
  "get_product",
  {
    description: "Get product details including components and versions",
    inputSchema: {
      name: z.string().describe("Product name (e.g. Firefox)"),
    },
  },
  getProduct,
)

server.registerTool(
  "get_user",
  {
    description: "Look up a Bugzilla user by email or login name",
    inputSchema: {
      name: z.string().describe("User email or login name"),
    },
  },
  getUser,
)

server.registerTool(
  "get_bug_fields",
  {
    description: "List bug fields and their legal values",
    inputSchema: {
      field_name: z
        .string()
        .optional()
        .describe("Specific field name to inspect (e.g. status, severity)"),
    },
  },
  getBugFields,
)

const main = async () => {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("mcp-bugzilla running")
  if (!API_KEY) {
    console.error(
      "Note: MCP_BUGZILLA_API_KEY not set — read-only mode (create/update/comment disabled)",
    )
  }
}

main().catch((e) => {
  console.error("Fatal:", e)
  process.exit(1)
})
