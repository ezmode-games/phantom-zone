import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchInput } from "../../../src/components/sidebar/SearchInput";

describe("SearchInput Component (PZ-206)", () => {
  describe("rendering", () => {
    it("renders input with value", () => {
      render(<SearchInput value="test" onChange={vi.fn()} />);
      expect(screen.getByRole("textbox")).toHaveValue("test");
    });

    it("renders with default placeholder", () => {
      render(<SearchInput value="" onChange={vi.fn()} />);
      expect(screen.getByPlaceholderText("Search blocks...")).toBeInTheDocument();
    });

    it("renders with custom placeholder", () => {
      render(<SearchInput value="" onChange={vi.fn()} placeholder="Find blocks" />);
      expect(screen.getByPlaceholderText("Find blocks")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<SearchInput value="" onChange={vi.fn()} className="custom-search" />);
      const container = screen.getByRole("textbox").closest(".pz-search-input");
      expect(container).toHaveClass("custom-search");
    });
  });

  describe("onChange behavior", () => {
    it("calls onChange when typing", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<SearchInput value="" onChange={onChange} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "heading");

      expect(onChange).toHaveBeenCalledTimes(7); // One for each character
    });

    it("passes new value to onChange", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<SearchInput value="" onChange={onChange} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "h");

      expect(onChange).toHaveBeenCalledWith("h");
    });
  });

  describe("clear button", () => {
    it("shows clear button when value is not empty", () => {
      render(<SearchInput value="test" onChange={vi.fn()} />);
      expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
    });

    it("hides clear button when value is empty", () => {
      render(<SearchInput value="" onChange={vi.fn()} />);
      expect(screen.queryByLabelText("Clear search")).not.toBeInTheDocument();
    });

    it("calls onChange with empty string when clear is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<SearchInput value="test" onChange={onChange} />);

      await user.click(screen.getByLabelText("Clear search"));
      expect(onChange).toHaveBeenCalledWith("");
    });
  });

  describe("escape key", () => {
    it("clears value on Escape when value exists", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<SearchInput value="test" onChange={onChange} />);

      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.keyboard("{Escape}");

      expect(onChange).toHaveBeenCalledWith("");
    });

    it("does not call onChange on Escape when value is empty", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<SearchInput value="" onChange={onChange} />);

      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.keyboard("{Escape}");

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("has aria-label on input", () => {
      render(<SearchInput value="" onChange={vi.fn()} />);
      expect(screen.getByLabelText("Search blocks")).toBeInTheDocument();
    });
  });
});
