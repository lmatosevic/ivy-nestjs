import { DOMParser } from '@xmldom/xmldom';

export class TemplateUtil {
  static htmlFromText(text: string): string {
    if (!text) {
      return '';
    }
    const replacedText = text.replace(/(\r\n|\r|\n)/g, '<br>');
    return `<p>${replacedText}</p>`;
  }

  static textFromHtml(html: string): string {
    if (!html) {
      return '';
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.documentElement?.getElementsByTagName('body')?.[0] || doc.documentElement;
    return body?.textContent || '';
  }
}
