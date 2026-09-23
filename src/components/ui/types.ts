/** A choice in a segmented control, chip group or tab list. */
export interface Option<T extends string> {
  value: T;
  label: string;
}
