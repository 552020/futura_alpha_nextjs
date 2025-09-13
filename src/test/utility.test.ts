import { describe, it, expect } from "vitest";

// Simple utility function to test
function add(a: number, b: number): number {
  return a + b;
}

function multiply(a: number, b: number): number {
  return a * b;
}

function isEven(num: number): boolean {
  return num % 2 === 0;
}

describe("Utility Functions", () => {
  describe("add", () => {
    it("should add two positive numbers", () => {
      expect(add(2, 3)).toBe(5);
    });

    it("should add negative numbers", () => {
      expect(add(-1, -2)).toBe(-3);
    });

    it("should add zero", () => {
      expect(add(5, 0)).toBe(5);
    });
  });

  describe("multiply", () => {
    it("should multiply two numbers", () => {
      expect(multiply(3, 4)).toBe(12);
    });

    it("should handle zero", () => {
      expect(multiply(5, 0)).toBe(0);
    });
  });

  describe("isEven", () => {
    it("should return true for even numbers", () => {
      expect(isEven(2)).toBe(true);
      expect(isEven(10)).toBe(true);
      expect(isEven(0)).toBe(true);
    });

    it("should return false for odd numbers", () => {
      expect(isEven(1)).toBe(false);
      expect(isEven(7)).toBe(false);
      expect(isEven(-3)).toBe(false);
    });
  });
});
