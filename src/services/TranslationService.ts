import { ITranslationService } from "./ITranslationService";
import { HttpClient, HttpClientConfiguration } from "@microsoft/sp-http";
import { ILanguage } from "../models/ILanguage";
import { IDictionary } from "../models/IDictionary";
import { ITranslatorLanguage } from "../models/ITranslatorLanguage";
import { IDetectedLanguage } from "../models/IDetectedLanguage";
import { ITranslationResult } from "../models/ITranslationResult";
import { IBreakSentenceResult } from "../models/IBreakSentenceResult";
import { SPHttpClient } from '@microsoft/sp-http';
import { Guid } from "@microsoft/sp-core-library";

export class TranslationService implements ITranslationService {

  private httpClient: HttpClient;
  private apiKey: string;
  private headers: Headers;
  private host: string;
  private sphttpclient: SPHttpClient;

  constructor(httpClient: HttpClient, sphttpclient: SPHttpClient, apiKey: string, regionSpecifier: string = "") {
    this.httpClient = httpClient;
    this.apiKey = apiKey;
    this.host = `api${regionSpecifier}.cognitive.microsofttranslator.com`;
    this.headers = new Headers();
    this.headers.append("Content-type", "application/json");
    this.headers.append("Ocp-Apim-Subscription-Key", this.apiKey);
    this.sphttpclient = sphttpclient;
  }

  public async getAvailableLanguages(supportedLanguages: string[]): Promise<ILanguage[]> {
    const httpClient = this.httpClient;
    const path: string = "languages?api-version=3.0&scope=dictionary";

    const result = await httpClient.get(
      `https://${this.host}/${path}`,
      new HttpClientConfiguration({}),
      { headers: this.headers }
    );

    if (!result.ok) {
      const resultData: any = await result.json();
      throw new Error(resultData.error.message);
    }

    const translatorLanguages: IDictionary<ITranslatorLanguage> = (await result.json()).dictionary;
    const languages: ILanguage[] = supportedLanguages.map((languageCode: string) => {
      if (translatorLanguages[languageCode]) {
        return {
          label: translatorLanguages[languageCode].nativeName,
          code: languageCode
        };
      }
    });

    return languages;
  }

  public async detectLanguage(text: string): Promise<IDetectedLanguage> {
    const httpClient = this.httpClient;
    const path: string = "detect?api-version=3.0";

    const body: string = JSON.stringify([{ Text: text }]);

    const result = await httpClient.post(
      `https://${this.host}/${path}`,
      new HttpClientConfiguration({}),
      {
        headers: this.headers,
        body: body
      }
    );

    if (!result.ok) {
      const resultData: any = await result.json();
      throw new Error(resultData.error.message);
    }

    const detectLanguageInfo: IDetectedLanguage[] = await result.json();
    if (detectLanguageInfo.some((langInfo: IDetectedLanguage) => langInfo.score >= 0.8 && langInfo.isTranslationSupported)) {
      return detectLanguageInfo.filter((langInfo: IDetectedLanguage) => langInfo.score >= 0.8 && langInfo.isTranslationSupported)[0];
    }

    return null;
  }


  public async getSitePageLibraryInfo(siteurl: string, listItemId :string): Promise<any> {

    const result = await this.sphttpclient.post(siteurl, SPHttpClient.configurations.v1, {
      body: JSON.stringify({
        parameters: {
          ViewXml: `<View Scope="RecursiveAll">
                  <ViewFields>
                    <FieldRef Name="_SPIsTranslation" />
                    <FieldRef Name="_SPTranslatedLanguages" />
                    <FieldRef Name="_SPTranslationLanguage" />
                    <FieldRef Name="_SPTranslationSourceItemId" />
                  </ViewFields>
                  <Query>
                    <Where>
                    <Eq>
                        <FieldRef Name="ID" />
                        <Value Type="Number">${listItemId}</Value>
                    </Eq>
                </Where>
                  </Query>
                  <RowLimit />
                </View>`
        }
      })
    });

    return result;

  }

  public async getSitePageLibraryInfoByUniqueId(siteurl: string, pageid: Guid): Promise<any> {

    const result = await this.sphttpclient.post(siteurl, SPHttpClient.configurations.v1, {
      body: JSON.stringify({
        parameters: {
          ViewXml: `<View Scope="RecursiveAll">
                  <ViewFields>
                    <FieldRef Name="_SPIsTranslation" />
                    <FieldRef Name="_SPTranslatedLanguages" />
                    <FieldRef Name="_SPTranslationLanguage" />
                    <FieldRef Name="_SPTranslationSourceItemId" />
                  </ViewFields>
                  <Query>
                    <Where>
                    <Eq>
                        <FieldRef Name="UniqueId" />
                        <Value Type="Guid">${pageid}</Value>
                    </Eq>
                </Where>
                  </Query>
                  <RowLimit />
                </View>`
        }
      })
    });

    return result;

  }

  public async translate(sourceText: string, languageCode: string, asHtml: boolean): Promise<ITranslationResult> {
    const httpClient = this.httpClient;
    const path: string = `translate?api-version=3.0&to=${languageCode}&textType=${asHtml ? "html" : "plain"}`;

    const body: string = JSON.stringify([{ Text: sourceText }]);

    const result = await httpClient.post(
      `https://${this.host}/${path}`,
      new HttpClientConfiguration({}),
      {
        headers: this.headers,
        body: body
      }
    );

    if (!result.ok) {
      const resultData: any = await result.json();
      throw new Error(resultData.error.message);
    }

    const translationInfo: ITranslationResult[] = await result.json();

    if (translationInfo.length > 0) {
      return translationInfo[0];
    } else {
      return null;
    }
  }

  public async breakSentence(sourceText: string): Promise<IBreakSentenceResult> {
    const httpClient = this.httpClient;
    const path: string = `breaksentence?api-version=3.0`;

    const body: string = JSON.stringify([{ Text: sourceText }]);

    const result = await httpClient.post(
      `https://${this.host}/${path}`,
      new HttpClientConfiguration({}),
      {
        headers: this.headers,
        body: body
      }
    );

    if (!result.ok) {
      const resultData: any = await result.json();
      throw new Error(resultData.error.message);
    }

    const breakSentenceInfo: IBreakSentenceResult[] = await result.json();

    if (breakSentenceInfo.length > 0) {
      return breakSentenceInfo[0];
    } else {
      return null;
    }
  }
}
