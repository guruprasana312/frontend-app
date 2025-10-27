import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

// Mock the API module used by your components
jest.mock("../services/api", () => ({
  getBills: jest.fn(),
  getByCustomer: jest.fn(),
  getSorted: jest.fn(),
  addBill: jest.fn(),
  deleteBill: jest.fn(),
}));

import { getBills, getByCustomer, getSorted, addBill, deleteBill } from "../services/api";

const fmtMoney = (n) =>
  Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

describe("QuickBill React App", () => {
  const mockBills = [
    {
      id: 1,
      customerName: "John Doe",
      billDate: "2025-09-05",
      amount: 2000,
      tax: 100,
      discount: 50,
      total: 2050,
    },
    {
      id: 2,
      customerName: "Alice",
      billDate: "2025-09-10",
      amount: 500,
      tax: 25,
      discount: 0,
      total: 525,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, "confirm").mockImplementation(() => true);
  });

  // ---------- Render / Empty State ----------
  test("render_app_title_and_empty_state", async () => {
    getBills.mockResolvedValueOnce({ data: [] });

    render(<App />);

    expect(await screen.findByText("QuickBill Management")).toBeInTheDocument();
    expect(await screen.findByText("QuickBill — Bills")).toBeInTheDocument();
    expect(await screen.findByText("No bills found")).toBeInTheDocument();
  });

  test("render_list_of_bills_with_computed_totals", async () => {
    getBills.mockResolvedValueOnce({ data: mockBills });

    render(<App />);

    expect(await screen.findByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();

    const jTotal = 2000 + 100 - 50;
    const aTotal = 500 + 25 - 0;
    expect(screen.getAllByText(/Total:/i)[0]).toHaveTextContent(fmtMoney(jTotal));
    expect(screen.getAllByText(/Total:/i)[1]).toHaveTextContent(fmtMoney(aTotal));
  });

  // ---------- Add Bill ----------
  test("add_bill_should_send_computed_total_and_refresh_list", async () => {
    getBills.mockResolvedValueOnce({ data: [] });
    addBill.mockResolvedValueOnce({ data: { id: 123 } });

    const added = {
      id: 123,
      customerName: "Rahul",
      billDate: "2025-09-12",
      amount: 1000.5,
      tax: 50,
      discount: 10,
    };
    getBills.mockResolvedValueOnce({ data: [added] });

    const { container } = render(<App />);

    fireEvent.change(await screen.findByPlaceholderText("Customer Name"), { target: { value: "Rahul" } });
    const dateInput = container.querySelector('input[name="billDate"]');
    fireEvent.change(dateInput, { target: { value: "2025-09-12" } });
    fireEvent.change(screen.getByPlaceholderText("Amount"), { target: { value: "1000.50" } });
    fireEvent.change(screen.getByPlaceholderText("Tax"), { target: { value: "50" } });
    fireEvent.change(screen.getByPlaceholderText("Discount"), { target: { value: "10" } });

    fireEvent.click(screen.getByText("Add Bill"));

    await waitFor(() => expect(addBill).toHaveBeenCalledTimes(1));
    expect(addBill.mock.calls[0][0]).toEqual({
      customerName: "Rahul",
      billDate: "2025-09-12",
      amount: 1000.5,
      tax: 50,
      discount: 10,
      total: 1040.5,
    });

    expect(await screen.findByText("Rahul")).toBeInTheDocument();
  });

  // ---------- Delete ----------
  test("delete_bill_should_remove_item_and_refresh_list", async () => {
    getBills.mockResolvedValueOnce({ data: mockBills }).mockResolvedValueOnce({ data: [mockBills[1]] });
    deleteBill.mockResolvedValueOnce({});

    render(<App />);

    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Delete")[0]);

    await waitFor(() => expect(screen.queryByText("John Doe")).not.toBeInTheDocument());
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(deleteBill).toHaveBeenCalledTimes(1);
    expect(deleteBill).toHaveBeenCalledWith(1);
  });

  // ---------- Sort ----------
  test("sort_bills_by_date_should_reorder_list", async () => {
    const initial = [...mockBills];
    const sorted = [...initial].reverse();

    getBills.mockResolvedValueOnce({ data: initial });
    getSorted.mockResolvedValueOnce({ data: sorted });

    render(<App />);

    expect(await screen.findByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Sort by Date"));

    await waitFor(() => {
      const items = screen.getAllByRole("listitem");
      expect(items[0]).toHaveTextContent(/Alice/);
      expect(items[1]).toHaveTextContent(/John Doe/);
    });
  });

  // ---------- Filter / Search ----------
  test("search_by_customer_should_filter_list", async () => {
    getBills.mockResolvedValueOnce({ data: mockBills });
    getByCustomer.mockResolvedValueOnce({ data: [mockBills[1]] });

    render(<App />);

    expect(await screen.findByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Filter by customer..."), { target: { value: "Alice" } });
    fireEvent.click(screen.getByText("Search"));

    await waitFor(() => expect(getByCustomer).toHaveBeenCalledWith("Alice"));
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    });
  });

  test("reset_should_show_full_list_again", async () => {
    getBills.mockResolvedValueOnce({ data: mockBills });
    getBills.mockResolvedValueOnce({ data: mockBills });

    render(<App />);

    fireEvent.click(await screen.findByText("Reset"));

    expect(await screen.findByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  test("cancel_delete_should_not_remove_item", async () => {
    getBills.mockResolvedValueOnce({ data: mockBills });
    window.confirm.mockImplementationOnce(() => false);

    render(<App />);

    expect(await screen.findByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Delete")[0]);

    await waitFor(() => expect(deleteBill).not.toHaveBeenCalled());
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });
});
