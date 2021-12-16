import { ITranslationService } from "../../services/ITranslationService";
import { PageContext } from '@microsoft/sp-page-context'; // load page context declaration
export interface ITranslationBarProps {
  supportedLanguages: string[];
  currentPageId: number;
  currentListId: string;
  currentWebUrl: string;
  absoluteUrl: string;
  translationService: ITranslationService;
  pageContext: PageContext;
}
