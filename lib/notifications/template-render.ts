import type { EmailTemplateVariable } from "./email-template-types";

export function renderEmailTemplate(
  template: string,
  vars: Partial<Record<EmailTemplateVariable, string>>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key as EmailTemplateVariable];
    return value ?? "";
  });
}
