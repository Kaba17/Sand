import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { CreateClaimRequest, UpdateClaimRequest, ClaimsQueryParams, InsertTimelineEvent, InsertCommunication, InsertSettlement } from "@shared/schema";

// --- Claims Hooks ---

export function useClaims(params?: ClaimsQueryParams) {
  return useQuery({
    queryKey: [api.claims.list.path, params],
    queryFn: async () => {
      const url = params 
        ? `${api.claims.list.path}?${new URLSearchParams(params as Record<string, string>)}`
        : api.claims.list.path;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch claims");
      return api.claims.list.responses[200].parse(await res.json());
    },
  });
}

export function useClaim(id: number) {
  return useQuery({
    queryKey: [api.claims.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.claims.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch claim details");
      return api.claims.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useTrackClaim(claimId: string, phone: string) {
  return useQuery({
    queryKey: [api.claims.track.path, claimId, phone],
    queryFn: async () => {
      const url = buildUrl(api.claims.track.path, { claimId });
      // Phone is passed as body in GET? No, schema says Input. 
      // GET requests with body are non-standard. Usually this would be query params.
      // Based on schema input definition for GET, it's likely expected as query param in a real impl,
      // but if the backend expects body on GET, fetch supports it but browsers might strip it.
      // We will assume query param for safety here.
      const queryUrl = `${url}?phone=${encodeURIComponent(phone)}`;
      const res = await fetch(queryUrl, { credentials: "include" });
      
      if (res.status === 404) throw new Error("Claim not found");
      if (!res.ok) throw new Error("Failed to track claim");
      
      return api.claims.track.responses[200].parse(await res.json());
    },
    enabled: !!claimId && !!phone,
    retry: false,
  });
}

export function useCreateClaim() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateClaimRequest) => {
      const res = await fetch(api.claims.create.path, {
        method: api.claims.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create claim");
      }
      return api.claims.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.claims.list.path] });
      toast({
        title: "تم إنشاء المطالبة بنجاح",
        description: "سيتم مراجعة طلبك والرد عليك قريباً",
        className: "bg-green-50 border-green-200 text-green-900",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في إنشاء المطالبة",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateClaim() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateClaimRequest) => {
      const url = buildUrl(api.claims.update.path, { id });
      const res = await fetch(url, {
        method: api.claims.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update claim");
      return api.claims.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.claims.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.claims.list.path] });
      toast({
        title: "تم تحديث المطالبة",
        description: "تم حفظ التغييرات بنجاح",
      });
    },
  });
}

// --- Sub-resource Hooks ---

export function useAddTimelineEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ claimId, ...data }: InsertTimelineEvent) => {
      const url = buildUrl(api.timeline.create.path, { id: claimId });
      const res = await fetch(url, {
        method: api.timeline.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add timeline event");
      return api.timeline.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.claims.get.path, variables.claimId] });
      toast({ title: "تم إضافة الحدث" });
    },
  });
}

export function useAddCommunication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ claimId, ...data }: InsertCommunication) => {
      const url = buildUrl(api.communications.create.path, { id: claimId });
      const res = await fetch(url, {
        method: api.communications.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to log communication");
      return api.communications.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.claims.get.path, variables.claimId] });
      toast({ title: "تم تسجيل التواصل" });
    },
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ claimId, ...data }: InsertSettlement) => {
      const url = buildUrl(api.settlements.create.path, { id: claimId });
      const res = await fetch(url, {
        method: api.settlements.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create settlement");
      return api.settlements.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.claims.get.path, variables.claimId] });
      toast({ title: "تم إنشاء التسوية وإغلاق المطالبة" });
    },
  });
}

// --- Upload Hook (Generic) ---
export function useUploadFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Upload failed");
      return await res.json(); // Expecting { id, url, filename }
    },
  });
}
