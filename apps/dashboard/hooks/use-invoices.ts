import { useQuery } from "@tanstack/react-query";
import api from "@workspace/axios";
import { toast } from "sonner";

export interface Invoice {
  serial: number;
  userId: string;
  newsletterId: string | null;
  provider: string;
  amount: number;
  currency: string;
  reference: string;
  status: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export const useGetInvoices = () => {
  return useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      try {
        const response = await api.get("/subscriptions/invoices");
        if (response.data.success) {
          return response.data.data || [];
        }
        throw new Error(response.data.message || "Failed to fetch invoices");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch invoices";
        toast.error(message);
        throw error;
      }
    },
  });
};
