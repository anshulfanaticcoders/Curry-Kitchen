export function complimentaryItemIdsFromFormData(formData: FormData) {
  return Array.from(
    new Set(formData.getAll("complimentaryItemIds").map(String).map((id) => id.trim()).filter(Boolean)),
  );
}
