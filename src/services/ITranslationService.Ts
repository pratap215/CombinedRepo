import { ILanguage } from "../models/ILanguage";
import { IDetectedLanguage } from "../models/IDetectedLanguage";
import { ITranslationResult } from "../models/ITranslationResult";
import { IBreakSentenceResult } from "../models/IBreakSentenceResult";
import { Guid } from "@microsoft/sp-core-library";

export interface ITranslationService {
  getAvailableLanguages(supportedLanguages: string[]): Promise<ILanguage[]>;
  detectLanguage(text: string): Promise<IDetectedLanguage>;
  translate(sourceText: string, languageCode: string, asHtml: boolean): Promise<ITranslationResult>;
  breakSentence(sourceText: string): Promise<IBreakSentenceResult>;
  getSitePageLibraryInfo(siteurl: string, listItemId: string): Promise<any>;
  getSitePageLibraryInfoByUniqueId(siteurl: string, pageid: Guid): Promise<any>;
  getPageMode(restApi: string): Promise<string>;
}
