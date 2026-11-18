// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProductImage } from "./ProductImage";

afterEach(cleanup);

it("shows a clear placeholder for a missing product image", () => {
  render(<ProductImage src={null} name="Switch" />);

  expect(screen.getByRole("img", { name: "Image unavailable for Switch" })).toBeInTheDocument();
});

it("replaces a broken image with a placeholder and tries a different product image", () => {
  const view = render(<ProductImage src="https://images.example.test/first" name="Switch" />);
  fireEvent.error(screen.getByRole("img", { name: "Switch" }));
  expect(screen.getByRole("img", { name: "Image unavailable for Switch" })).toBeInTheDocument();

  view.rerender(<ProductImage src="https://images.example.test/second" name="Valve" />);
  expect(screen.getByRole("img", { name: "Valve" })).toHaveAttribute("src", "https://images.example.test/second");
});
