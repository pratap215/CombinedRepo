import { ITranslationService } from "./ITranslationService";
import { HttpClient, HttpClientConfiguration, HttpClientResponse, IHttpClientOptions } from "@microsoft/sp-http";
import { ILanguage } from "../models/ILanguage";
import { IDictionary } from "../models/IDictionary";
import { ITranslatorLanguage } from "../models/ITranslatorLanguage";
import { IDetectedLanguage } from "../models/IDetectedLanguage";
import { ITranslationResult } from "../models/ITranslationResult";
import { IBreakSentenceResult } from "../models/IBreakSentenceResult";
import { IItemAddResult } from "@pnp/sp/items";
import { sp } from "@pnp/sp";
import { environment } from '../environments/environment';

export class TranslationService implements ITranslationService {

  private httpClient: HttpClient;
  private apiKey: string;
  private headers: Headers;
  private host: string;

  constructor(httpClient: HttpClient, apiKey: string, regionSpecifier: string = "") {
    this.httpClient = httpClient;
    this.apiKey = apiKey;
    this.host = `api${regionSpecifier}.cognitive.microsofttranslator.com`;
    this.headers = new Headers();
    this.headers.append("Content-type", "application/json");
    this.headers.append("Ocp-Apim-Subscription-Key", this.apiKey);
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


  private CheckListData = async (cachekey: string): Promise<string> => {
    let returntext: string = undefined;
    try {
      const allItems: any[] = await sp.web.lists.getByTitle("CacheList").items.getAll();
      for (var i = 0; i < allItems.length; i++) {
        if (allItems[i].cachekey == cachekey) {
          return allItems[i].cachevalue;
        }
      }
    } catch (error) {
      console.log(error);
      console.log("Error in CheckListData");
    }
    return returntext;
  }

  private AddToList = async (cachekey: string, cachevalue: string): Promise<void> => {

    try {
      await sp.web.lists.getByTitle("CacheList").items.add({
        Title: "Title",
        cachekey: cachekey,
        cachevalue: cachevalue,

      });
    } catch (error) {
      console.log(error);
      console.log("Error in AddToList");
    }
  }

  public async translatetotext(elementtextcontent: string, sourceText: string, languageCode: string, asHtml: boolean): Promise<string> {
    const httpClient = this.httpClient;

    const cachekey = elementtextcontent.replace(/[^a-zA-Z0-9]/g, '').trim() + languageCode;
    let cacheData = "novalue";

    //const cacheurl = "http://localhost:8585/api/RedisCache/GetCacheData?cacheKey=";

    //const ckey = "test";

    //const cachegetresult = await httpClient.get(
    //  `http://localhost:8585/api/RedisCache/GetCacheData?cacheKey=test`,
    //  new HttpClientConfiguration({}),
    //  { headers: this.headers }
    //);

    // console.log(cachegetresult);

    //`https://localhost:44352/api/RedisCache/GetCacheData?cacheKey=${cachekey}`,
    try {

      const requestHeaders: Headers = new Headers();
      requestHeaders.append("method", "GET");

      const postOptions: IHttpClientOptions = {
        headers: requestHeaders
      };

      await httpClient
        .get(
          `${environment.config.cacheUrl}GetCacheData?cacheKey=${cachekey}`,
          HttpClient.configurations.v1, postOptions
        )
        .then((response: HttpClientResponse): Promise<any> => {
          return response.json();
        })
        .then((data: any): void => {
          cacheData = data;
        });

    } catch (e) {
      console.log(e);
      console.log("Error in get api call");
    }


    if (cacheData !== "novalue") {
      console.log("Data From [Cache API]");
      return cacheData;
    }

    //const foundData = await this.CheckListData(cachekey);
    //if (foundData != undefined) {
    //  console.log('In translate code getting data from [CACHE] ' + languageCode);
    //  return foundData;
    //}

    if (cacheData == "novalue") {

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
        // if (foundData == undefined) {
        //await this.AddToList(cachekey, translationInfo[0].translations[0].text);
        //}
        await this.addCache(cachekey, translationInfo[0].translations[0].text);
        console.log('Data from [Translator API] ' + cachekey + " " + languageCode);
        return translationInfo[0].translations[0].text;
      } else {
        return null;
      }

    }
   

  }

  private async addCache(cachekey: string, cachevalue: string): Promise<void> {
    const httpClient = this.httpClient;
    // .fetch(`https://localhost:44352/api/RedisCache/SetCacheData`,
    try {
      const requestHeaders1: Headers = new Headers();
      requestHeaders1.append("Content-type", "application/json");
      requestHeaders1.append("accept", "application/json");

      await httpClient
        .fetch(`${environment.config.cacheUrl}SetCacheData`,
          HttpClient.configurations.v1, {
          method: "POST",
          headers: requestHeaders1,
          body: JSON.stringify({ cacheKey: cachekey, cachevalue: cachevalue })
        })
        .then((response: HttpClientResponse): Promise<any[]> => {
          return response.json();
        }).then((data: any): void => {
          //console.log(data);
          console.log("Success from Post api call");

        });
    } catch (e) {
      console.log(e);
      console.log("Error in post api call");
    }

  }

  public async translate(sourceText: string, languageCode: string, asHtml: boolean): Promise<ITranslationResult> {
    const httpClient = this.httpClient;
    const path: string = `translate?api-version=3.0&to=${languageCode}&textType=${asHtml ? "html" : "plain"}`;
    console.log('In translate code start text ' + languageCode);
    //console.log(sourceText);
    console.log('In translate code end text ' + languageCode);

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
      //      console.log('in translate result ' + translationInfo[0].translations[0].text);
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
