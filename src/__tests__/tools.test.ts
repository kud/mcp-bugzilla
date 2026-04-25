import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  process.env.MCP_BUGZILLA_API_KEY = "test-api-key"
})

import {
  createBug,
  createComment,
  err,
  getAttachments,
  getBug,
  getBugFields,
  getBugHistory,
  getComments,
  getProduct,
  getProducts,
  getUser,
  ok,
  searchBugs,
  updateBug,
} from "../index.js"

const mockFetch = vi.fn()

beforeAll(() => {
  vi.stubGlobal("fetch", mockFetch)
})

beforeEach(() => {
  mockFetch.mockReset()
})

const res = (data: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response)

const failRes = () =>
  Promise.resolve({
    ok: false,
    status: 500,
    text: () => Promise.resolve("Internal Server Error"),
  } as unknown as Response)

const text = (result: { content: Array<{ text: string }> }) =>
  result.content[0].text

// ─── ok / err helpers ───

describe("ok", () => {
  it("serialises data as JSON", () => {
    const result = ok({ id: 1 })
    expect(text(result)).toBe(JSON.stringify({ id: 1 }, null, 2))
  })
})

describe("err", () => {
  it("prefixes message with Error:", () => {
    expect(text(err("something went wrong"))).toBe(
      "Error: something went wrong",
    )
  })
})

// ─── Bugs ───

describe("getBug", () => {
  it("returns bug data on success", async () => {
    mockFetch.mockReturnValue(
      res({ bugs: [{ id: 1234567, summary: "Test bug" }] }),
    )
    const result = await getBug({ id: "1234567" })
    expect(text(result)).toContain("Test bug")
    expect(mockFetch.mock.calls[0][0]).toContain("/bug/1234567")
  })

  it("returns error when bug not found", async () => {
    mockFetch.mockReturnValue(res({ bugs: [] }))
    const result = await getBug({ id: "999" })
    expect(text(result)).toContain("Error:")
  })

  it("returns error on fetch failure", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getBug({ id: "1" })
    expect(text(result)).toContain("Error:")
  })
})

describe("searchBugs", () => {
  it("returns bugs array on success", async () => {
    mockFetch.mockReturnValue(res({ bugs: [{ id: 1, summary: "A bug" }] }))
    const result = await searchBugs({ product: "Firefox", limit: 10 })
    expect(text(result)).toContain("A bug")
    expect(mockFetch.mock.calls[0][0]).toContain("product=Firefox")
  })

  it("includes quicksearch param when provided", async () => {
    mockFetch.mockReturnValue(res({ bugs: [] }))
    await searchBugs({ quicksearch: "crash" })
    expect(mockFetch.mock.calls[0][0]).toContain("quicksearch=crash")
  })

  it("returns error on failure", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await searchBugs({ product: "Firefox" })
    expect(text(result)).toContain("Error:")
  })
})

describe("createBug", () => {
  it("returns new bug id on success", async () => {
    mockFetch.mockReturnValue(res({ id: 9999 }))
    const result = await createBug({
      product: "Firefox",
      component: "General",
      summary: "New bug",
      version: "130",
    })
    expect(text(result)).toContain("9999")
    expect(mockFetch.mock.calls[0][1]?.method).toBe("POST")
  })

  it("returns error on failure", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await createBug({
      product: "Firefox",
      component: "General",
      summary: "New bug",
      version: "130",
    })
    expect(text(result)).toContain("Error:")
  })
})

describe("updateBug", () => {
  it("returns updated bug on success", async () => {
    mockFetch.mockReturnValue(res({ bugs: [{ id: 1, changes: {} }] }))
    const result = await updateBug({ id: "1", status: "RESOLVED" })
    expect(text(result)).toContain("changes")
    expect(mockFetch.mock.calls[0][1]?.method).toBe("PUT")
  })

  it("returns error on failure", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await updateBug({ id: "1", status: "RESOLVED" })
    expect(text(result)).toContain("Error:")
  })
})

describe("getBugHistory", () => {
  it("returns history on success", async () => {
    mockFetch.mockReturnValue(
      res({ bugs: [{ id: 1, history: [{ when: "2024-01-01" }] }] }),
    )
    const result = await getBugHistory({ id: "1" })
    expect(text(result)).toContain("history")
  })

  it("returns error when no history entry", async () => {
    mockFetch.mockReturnValue(res({ bugs: [] }))
    const result = await getBugHistory({ id: "1" })
    expect(text(result)).toContain("Error:")
  })
})

// ─── Comments ───

describe("getComments", () => {
  it("returns comments on success", async () => {
    mockFetch.mockReturnValue(
      res({ bugs: { "1": { comments: [{ id: 10, text: "Hello" }] } } }),
    )
    const result = await getComments({ id: "1" })
    expect(text(result)).toContain("Hello")
    expect(mockFetch.mock.calls[0][0]).toContain("/bug/1/comment")
  })

  it("appends new_since param when provided", async () => {
    mockFetch.mockReturnValue(res({ bugs: { "1": { comments: [] } } }))
    await getComments({ id: "1", new_since: "2024-01-01T00:00:00Z" })
    expect(mockFetch.mock.calls[0][0]).toContain("new_since=")
  })

  it("returns error on failure", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getComments({ id: "1" })
    expect(text(result)).toContain("Error:")
  })
})

describe("createComment", () => {
  it("returns new comment id on success", async () => {
    mockFetch.mockReturnValue(res({ id: 42 }))
    const result = await createComment({ id: "1", comment: "Looks good" })
    expect(text(result)).toContain("42")
    expect(mockFetch.mock.calls[0][1]?.method).toBe("POST")
  })

  it("returns error on failure", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await createComment({ id: "1", comment: "Looks good" })
    expect(text(result)).toContain("Error:")
  })
})

// ─── Attachments ───

describe("getAttachments", () => {
  it("returns attachments on success", async () => {
    mockFetch.mockReturnValue(
      res({ bugs: { "1": [{ id: 5, file_name: "patch.diff" }] } }),
    )
    const result = await getAttachments({ id: "1" })
    expect(text(result)).toContain("patch.diff")
  })

  it("returns error on failure", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getAttachments({ id: "1" })
    expect(text(result)).toContain("Error:")
  })
})

// ─── Products ───

describe("getProducts", () => {
  it("returns product ids on success", async () => {
    mockFetch.mockReturnValue(res({ ids: [1, 2, 3] }))
    const result = await getProducts({ type: "accessible" })
    expect(text(result)).toContain("1")
    expect(mockFetch.mock.calls[0][0]).toContain("type=accessible")
  })

  it("returns error on failure", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getProducts({})
    expect(text(result)).toContain("Error:")
  })
})

describe("getProduct", () => {
  it("returns product data on success", async () => {
    mockFetch.mockReturnValue(
      res({ products: [{ name: "Firefox", components: [] }] }),
    )
    const result = await getProduct({ name: "Firefox" })
    expect(text(result)).toContain("Firefox")
  })

  it("returns error when product not found", async () => {
    mockFetch.mockReturnValue(res({ products: [] }))
    const result = await getProduct({ name: "UnknownProduct" })
    expect(text(result)).toContain("Error:")
  })
})

// ─── Users ───

describe("getUser", () => {
  it("returns user data on success", async () => {
    mockFetch.mockReturnValue(
      res({ users: [{ id: 7, email: "test@mozilla.com" }] }),
    )
    const result = await getUser({ name: "test@mozilla.com" })
    expect(text(result)).toContain("mozilla.com")
    expect(mockFetch.mock.calls[0][0]).toContain("names=")
  })

  it("returns error when user not found", async () => {
    mockFetch.mockReturnValue(res({ users: [] }))
    const result = await getUser({ name: "nobody@example.com" })
    expect(text(result)).toContain("Error:")
  })
})

// ─── Fields ───

describe("getBugFields", () => {
  it("returns all fields when no field_name given", async () => {
    mockFetch.mockReturnValue(res({ fields: [{ name: "status", type: 2 }] }))
    const result = await getBugFields({})
    expect(text(result)).toContain("status")
    expect(mockFetch.mock.calls[0][0]).toContain("/field/bug")
  })

  it("queries specific field when field_name given", async () => {
    mockFetch.mockReturnValue(
      res({ fields: [{ name: "severity", values: [] }] }),
    )
    await getBugFields({ field_name: "severity" })
    expect(mockFetch.mock.calls[0][0]).toContain("/field/bug/severity")
  })

  it("returns error on failure", async () => {
    mockFetch.mockReturnValue(failRes())
    const result = await getBugFields({})
    expect(text(result)).toContain("Error:")
  })
})
