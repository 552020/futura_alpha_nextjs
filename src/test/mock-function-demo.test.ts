import { describe, it, expect, vi } from "vitest";

describe("Understanding vi.fn()", () => {
  it("should show what vi.fn() creates", () => {
    // Create a mock function
    const mockFunction = vi.fn();

    // It's NOT undefined - it's a function
    expect(mockFunction).toBeDefined();
    expect(typeof mockFunction).toBe("function");

    // You can call it (it won't do anything by default)
    mockFunction("hello", "world");

    // But it tracks that it was called
    expect(mockFunction).toHaveBeenCalled();
    expect(mockFunction).toHaveBeenCalledWith("hello", "world");
    expect(mockFunction).toHaveBeenCalledTimes(1);
  });

  it("should show how to make mock functions return values", () => {
    const mockGetUser = vi.fn();

    // Make it return a fake user
    mockGetUser.mockReturnValue({
      id: "user-123",
      name: "John Doe",
    });

    // Now when you call it, it returns the fake data
    const result = mockGetUser();
    expect(result).toEqual({
      id: "user-123",
      name: "John Doe",
    });
  });

  it("should show the difference between vi.fn() and undefined", () => {
    // This is undefined
    let undefinedValue;
    expect(undefinedValue).toBeUndefined();

    // This is a mock function
    const mockFunction = vi.fn();
    expect(mockFunction).toBeDefined();
    expect(mockFunction).not.toBeUndefined();

    // You can call the mock function
    mockFunction();
    expect(mockFunction).toHaveBeenCalled();
  });
});
