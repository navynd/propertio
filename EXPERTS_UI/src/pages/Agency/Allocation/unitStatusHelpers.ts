/** Assign screen: only units with no existing assignment can be selected. */
export function canSelectUnitForAssignment(
  _status: string | undefined,
  isAssigned: boolean,
): boolean {
  return !isAssigned;
}
