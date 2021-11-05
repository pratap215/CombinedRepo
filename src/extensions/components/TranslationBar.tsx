import * as React from "react";
import styles from "./TranslationBar.module.scss";

import { ITranslationBarProps } from "./ITranslationBarProps";
import { ITranslationBarState } from "./ITranslationBarState";

import { ActionButton } from "office-ui-fabric-react/lib/Button";
import { ILanguage } from "../../models/ILanguage";
import { INavigation } from "@pnp/sp/navigation";
import { IContextualMenuItem } from "office-ui-fabric-react/lib/ContextualMenu";
import { Layer } from "office-ui-fabric-react/lib/Layer";
import { MessageBar, MessageBarType } from "office-ui-fabric-react/lib/MessageBar";
import { Overlay } from "office-ui-fabric-react/lib/Overlay";
import { IDetectedLanguage } from "../../models/IDetectedLanguage";

import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/navigation";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/sites";
import { ColumnControl, ClientsideText, IClientsidePage, ClientsideWebpart } from "@pnp/sp/clientside-pages";
import { ITranslationResult } from "../../models/ITranslationResult";
import { IItemAddResult } from "@pnp/sp/items";
import { CWebPart } from "./CWebPart";
import { ITranslationService } from "../../services/ITranslationService";
import { Navigation } from "@pnp/sp/navigation";
import { PnPClientStorage, dateAdd } from '@pnp/common';
import { Dialog } from '@microsoft/sp-dialog';
import { TranslationService } from "../../services/TranslationService";
const pnpStorage = new PnPClientStorage();

export class TranslationBar extends React.Component<ITranslationBarProps, ITranslationBarState> {
  private isError: boolean;
  private tsprops: ITranslationBarProps;
  public cacheSelectedLanguage: ILanguage = undefined;
  public pageUrl: string = null;

  constructor(props: ITranslationBarProps) {
    super(props);

    this.tsprops = props;

    this.state = {
      availableLanguages: [],
      selectedLanguage: undefined,
      pageItem: undefined,
      isLoading: true,
      isTranslated: false,
      isTranslating: false,
      globalError: undefined
    };
  }

  public async componentDidMount() {
    this._initTranslationBar();
  }

  public async componentDidUpdate(nextProps: ITranslationBarProps) {
    if (nextProps.currentPageId !== this.props.currentPageId) {
      // Set original state
      this.setState({
        availableLanguages: [],
        selectedLanguage: undefined,
        pageItem: undefined,
        isLoading: true,
        isTranslated: false,
        isTranslating: false,
        globalError: undefined
      }, () => this._initTranslationBar());
    }
  }

  public render(): JSX.Element {

    const { availableLanguages, globalError, selectedLanguage, isLoading } = this.state;

    if (isLoading) {
      return (
        <div className={styles.translationBar}>
          <div className={styles.loadingButton}>Loading ...</div>
        </div>
      );
    }

    // if (globalError) {
    //   return (
    //     <div className={styles.translationBar}>
    //       <MessageBar messageBarType={MessageBarType.error}>
    //         {globalError}
    //       </MessageBar>
    //     </div>
    //   );
    // }

    if (!selectedLanguage) {
      return (
        <div className={styles.translationBar}>
          <MessageBar messageBarType={MessageBarType.info}>
            {"Could not determine the language of the page. It is either not supported by the API or it is not enabled by your adminitrator."}
          </MessageBar>
        </div>
      );
    }

    let currentMenuItems = [...availableLanguages];
    if (currentMenuItems.length <= 0) {
      currentMenuItems = [
        {
          key: "noTranslationsPlaceholder",
          name: "No available languages found",
          disabled: true
        }
      ];
    }

    return (
      <div className={styles.translationBar}>
        <ActionButton
          className={styles.actionButton}
          text={this.state.selectedLanguage.label}
          iconProps={{ iconName: "Globe" }}
          menuProps={{
            shouldFocusOnMount: true,
            items: currentMenuItems
          }}
        />
        {this.state.isTranslated && (
          <ActionButton
            className={styles.actionButton}
            text={"Reload original"}
            onClick={() => this._onReloadOriginal()}
          />
        )}
        {this.state.isTranslated && (
          <MessageBar messageBarType={MessageBarType.warning}>
            <span>
              Please be aware that the content on this page is translated by the Microsoft Translator Text API to provide a basic understanding of the content.
              It is a literal translation and certain words may not translate accurately....
            </span>
          </MessageBar>
        )}
        {this.state.isTranslating && (
          <Layer>
            <Overlay isDarkThemed={true} />
          </Layer>
        )}

        {this.state.globalError && (
          <MessageBar messageBarType={MessageBarType.error}>
            <span>
              {globalError}
            </span>
          </MessageBar>
        )}


      </div>
    );
  }

  private _initTranslationBar = async (): Promise<void> => {
    let selectedLanguage: ILanguage = undefined;
    try {
      const pageItem = await this._getPageItem();
      const textToDetect = pageItem["Description"] ? pageItem["Description"] : pageItem["Title"];

      const detectedLanguage = await this._detectLanguage(textToDetect);
      const availableLanguages = await this._getAvailableLanguages(detectedLanguage);
      // let selectedLanguage: ILanguage = undefined;
      //  if(this.state!==null && this.state!==undefined)
      //  {
      //   let statelanguage =  this.state;
      //   if(statelanguage.selectedLanguage!=null && statelanguage.selectedLanguage!==undefined)
      //   {
      //   Dialog.alert(`_initTranslationBar data statelanguage ${statelanguage.selectedLanguage.code}`);
      //   }
      //  }

      selectedLanguage = pnpStorage.local.get("PnP_UserLanguageInfo");
      if (selectedLanguage == null) {
        if (availableLanguages.some((l: IContextualMenuItem) => l.key === detectedLanguage.language)) {
          const selectedLanguageMenuItem = availableLanguages.filter((l: IContextualMenuItem) => l.key === detectedLanguage.language)[0];
          selectedLanguage = { label: selectedLanguageMenuItem.name, code: selectedLanguageMenuItem.key };
          pnpStorage.local.put('PnP_UserLanguageInfo', selectedLanguage, dateAdd(new Date(), 'hour', 10));

        }
      }

      this.setState({
        availableLanguages,
        selectedLanguage,
        pageItem,
        isLoading: false,
        isTranslated: false,
        isTranslating: false,
        globalError: undefined
      });

      if (selectedLanguage.code !== 'en') {
        this._onTranslate(selectedLanguage);
      }

    } catch (error) {
      console.dir(error);
      this.setState({ isLoading: false, isTranslating: false, isTranslated: true, globalError: (error as Error).message });
    }

  }
  private _getPageItem = async (): Promise<any> => {

    const page = await sp.web.lists
      .getById(this.props.currentListId)
      .items
      .getById(this.props.currentPageId)
      .select("Title", "FileLeafRef", "FileRef", "Description").get();

    return page;
  }

  private _detectLanguage = async (text: string): Promise<IDetectedLanguage> => {
    return await this.props.translationService.detectLanguage(text);
  }

  private _getAvailableLanguages = async (detectedLanguage: IDetectedLanguage): Promise<IContextualMenuItem[]> => {
    return (await this.props.translationService.getAvailableLanguages(this.props.supportedLanguages))
      .map((language: ILanguage) => {
        return {
          key: language.code,
          name: language.label,
          onClick: () => this._onTranslate(language),
          iconProps: language.code === detectedLanguage.language
            ? { iconName: "CheckMark" }
            : undefined
        };
      });
  }

  private _updateSelectedLanguage = (selectedLanguage: ILanguage): void => {
    const availableLanguages: IContextualMenuItem[] = [...this.state.availableLanguages].map((item: IContextualMenuItem) => {
      return {
        ...item,
        iconProps: item.key === selectedLanguage.code
          ? { iconName: "CheckMark" }
          : undefined
      };
    });
    this.setState({ availableLanguages, selectedLanguage });
  }

  private _onTranslate = (language: ILanguage): void => {
    this.cacheSelectedLanguage = pnpStorage.local.get("PnP_UserLanguageInfo");

    console.log("cacheSelectedLanguage " + this.cacheSelectedLanguage.code);
    console.log("selectedLanguage " + language.code);

   //if (this.cacheSelectedLanguage.code !== language.code) {
    if (true) {

      this.setState({ isTranslating: true });
      pnpStorage.local.put('PnP_UserLanguageInfo', language, dateAdd(new Date(), 'hour', 10));

      const relativePageUrl: string = `${this.props.currentWebUrl}/SitePages/${this.state.pageItem["FileLeafRef"]}`;

      sp.web.loadClientsidePage(relativePageUrl).then(async (clientSidePage: IClientsidePage) => {

        try {

          this.pageUrl = clientSidePage.data.url;

          // Translate title
          await this._translatePageTitle(clientSidePage.title, language.code);
          // console.log(JSON.stringify(clientSidePage.data));

          const top = sp.web.navigation.topNavigationBar;
          if (top != null && top.length > 0) {
            //await this._translatePageNav(top.toString, language.code);
          }
          //Get all text controls
          var textControls: ColumnControl<any>[] = [];
          clientSidePage.findControl((c) => {
            if (c instanceof ClientsideText) {
              textControls.push(c);
            }
            return false;
          });

          for (const control of textControls) {
            await this._translateTextControl(control as ClientsideText, language.code);
          }



          var textClientsideWebpartControls: ColumnControl<any>[] = [];
          clientSidePage.findControl((c) => {
            if (c instanceof ClientsideWebpart) {
              textClientsideWebpartControls.push(c);
            }
            return false;
          });
          let j: number = 0;
          for (const control of textClientsideWebpartControls) {
            console.log("Start-------------------------------");
            /*if (j == 0) {*/
              await this._translateWebPartTextControl(control as ClientsideWebpart, language.code);
            //}
            j = j + 1;
            console.log("End-------------------------------");
          }

          //await this._translateSiteHeaderTitle(language.code);


          this.setState({ isTranslating: false, isTranslated: true });
          this._updateSelectedLanguage(language);

          // await this._translateHorizontalMenu(language.code);
          if (this.isError) {
            throw new Error('Error in Translation');
          }

          console.log('completed');
          console.log('test');

          // await clientSidePage.save(true);

        } catch (error) {
          console.dir(error);
          console.log('error in internal catch');
          //console.log(error.message);
          this.setState({ selectedLanguage: language, isTranslating: false, isTranslated: true, globalError: error.message });
        }
      }).catch((error: Error) => {
        console.dir(error);
        console.log('error in outside catch');
        //console.log(error.message);
        this.setState({ selectedLanguage: language, isTranslating: false, isTranslated: true, globalError: error.message });
      });
   }

  }

  private _translateWebPartTextControl = async (textControl: ClientsideWebpart, languageCode: string): Promise<void> => {
    try {
      console.log(' ');
      console.log('Start _translateWebPartTextControl');
      const element = document.querySelector(`[data-sp-feature-instance-id='${textControl.id}']`);
      if (element && element.firstChild) {
        //console.log(element.innerHTML);
        await this._translateHtmlElement(element.firstChild as Element, languageCode, textControl.id);
      } else {
        console.error(`Text web part control with id: '${textControl.id}' not found!`);
      }
      console.log('End _translateWebPartTextControl');
    }
    catch (e) {
      console.dir(e);
      console.log('Error In _translateWebPartTextControl');
      this.isError = true;
    }
  }

  private _translatePageTitle = async (title: string, languageCode): Promise<void> => {
    console.log('Start _translatePageTitle');
    const translationResult: ITranslationResult = await this.props.translationService.translate(title, languageCode, false);
    // get the title element
    const pageTitle: Element = document.querySelector("div[data-automation-id='pageHeader'] div[role='heading']");
    if (pageTitle) {

      pageTitle.textContent = translationResult.translations[0].text;
      console.log(pageTitle.textContent);
    }
    console.log('End _translatePageTitle');
  }

  private _translatePageNav = async (navigation, languageCode): Promise<void> => {
    try {
      console.log('Start _translatePageNav');
      const translationResult: ITranslationResult = await this.props.translationService.translate(navigation, languageCode, false);
      console.log(' translationResult');
      console.log(translationResult);
      console.log('In _translatePageNav2');
      const nav: Element = document.querySelector("div[data-automation-id='pageHeader'] div[role='heading']");
      if (nav) {
        nav.textContent = translationResult.translations[0].text;
        console.log(nav.textContent);
      }
      console.log('End _translatePageNav');
    }
    catch (e) {
      console.dir(e);
      //console.log(e);
      console.log('Error In _translatePageNav');
      this.isError = true;
    }
  }


  private _translateTextControl = async (textControl: ClientsideText, languageCode: string): Promise<void> => {
    try {
      console.log('Start _translateTextControl');
      const element = document.querySelector(`[data-sp-feature-instance-id='${textControl.id}']`);
      // Translate element if found
      if (element && element.firstChild) {
        await this._translateHtmlElement(element.firstChild as Element, languageCode, textControl.id);
      } else {
        console.error(`Text control with id: '${textControl.id}' not found!`);
      }
      console.log('End _translateTextControl');
    }
    catch (e) {
      console.dir(e);
      console.log('Error In _translateTextControl');
      //console.log(e);
      this.isError = true;
    }
  }

  private _translateHtmlElement = async (element: Element, languageCode: string,controlid:string): Promise<void> => {

    console.log('Start _translateHtmlElement ' + element.innerHTML.length);
    // If inner HTML >= 5000 the API call will fail
    // translate each HMTL child node
    if (element.innerHTML.length > 4999) {
      const childElements = [].slice.call(element.children);
      if (childElements.length > 0) {
        for (const childElement of childElements) {
          await this._translateHtmlElement(childElement, languageCode, controlid);
        }
      } else {
        // Fallback: translate each sentence individually if the
        // the length of one html tag is longer then 4999 characters
        const breakSentenceResult = await this.props.translationService.breakSentence(element.textContent);

        let startIndex, endIndex = 0;

        const fullTextToTranslate = element.textContent;
        for (const sentenceLenght of breakSentenceResult.sentLen) {
          endIndex += sentenceLenght;
          const sentenceToTranslate = fullTextToTranslate.substring(startIndex, endIndex);

          const dataautomationid = element.attributes["data-automation-id"] !== undefined && element.attributes["data-automation-id"] !== null ? element.attributes["data-automation-id"].value : "nodataautomation";
          const classname = element.className != null ? element.className : "noclassname";
          const elementstyle = element.attributes["style"] !== undefined ? element.attributes["style"].value : "nostyle";
          const translatedText = await this.GetTranslatorFromSPList(controlid, dataautomationid, classname, languageCode, sentenceToTranslate, elementstyle, sentenceToTranslate, false);
          element.textContent = element.textContent.replace(
            sentenceToTranslate,
            translatedText
          );

          console.log("translatedText1");

          startIndex = endIndex;
        }
      }
    } else {

      if (element.innerHTML != null) {
        const elementtextcontent = element.textContent;
        if (typeof elementtextcontent != 'undefined' && elementtextcontent) {
        console.log("translatedText2-1");
        const dataautomationid = element.attributes["data-automation-id"] !== undefined && element.attributes["data-automation-id"] !== null ? element.attributes["data-automation-id"].value : "nodataautomation";
        const classname = element.className != null ? element.className : "noclassname";
        const elementstyle = element.attributes["style"] !== undefined ? element.attributes["style"].value : "nostyle";
        //console.log(element);
        //const body: string = JSON.stringify([{ Text: element.outerHTML }]);
        //console.log(body);
        //console.log(element.textContent);
        //console.log(dataautomationid);
        //console.log(classname);
        //console.log(controlid);
        
          const translatedText = await this.GetTranslatorFromSPList(controlid, dataautomationid, classname, languageCode, element.innerHTML, elementstyle,elementtextcontent, true);
          element.innerHTML = translatedText;
       
        //console.log("-------------------------------");
          console.log("translatedText2-2");
        }
      }
    }
    console.log('End _translateHtmlElement');
  }

  private _translateSiteHeaderTitle = async (languageCode): Promise<void> => {
    try {
      console.log('Start _translateSiteHeaderTitle');
      const element = document.querySelector(`[data-sp-feature-instance-id='_Site header host']`);
      // Translate element if found
      if (element && element.firstChild) {
        await this._translateHtmlElement(element.firstChild as Element, languageCode, '_Site header host');
      } else {
        console.error(`Text control with id: '_Site header host' not found!`);
      }
      console.log('End _translateSiteHeaderTitle');
    }
    catch (e) {
      console.dir(e);
      console.log('Error In _translateSiteHeaderTitle');
      //console.log(e);
      this.isError = true;
    }
  }

  private async GetTranslatorFromSPList(elementid: string, dataautomationid: string, classname: string, languageCode: string, sentenceToTranslate: string, elementstyle: string, elementtextcontent:string,asHtml: boolean) {
    const allItems: any[] = await sp.web.lists.getByTitle("Translator Data List").items.getAll();
    let translatedText = await this.CheckListData(allItems, elementid, dataautomationid, classname, languageCode, sentenceToTranslate, elementstyle, elementtextcontent);
    if (translatedText == undefined) {
      const translationResult = await this.props.translationService.translate(sentenceToTranslate, languageCode, asHtml);
      translatedText = translationResult.translations[0].text;
      await this.AddToList(allItems, elementid, dataautomationid, classname, languageCode, sentenceToTranslate, translatedText, elementstyle, elementtextcontent);
    }

    //const translationResult = await this.props.translationService.translate(sentenceToTranslate, languageCode, false);
    //const translatedText = translationResult.translations[0].text;
    return translatedText;
  }

  //private async CheckListData(allItems: any[], textControl: ClientsideWebpart, languageCode: string, controltitle: string): string {
  private CheckListData = async (allItems: any[], id: string, dataautomationid: string, classname: string, languageCode: string, controltitle: string, elementstyle: string, elementtextcontent: string): Promise<string> => {
    console.log("Checking data in list From Language : " + this.cacheSelectedLanguage.code + " To Language : " + languageCode);
    let returntext: string = undefined;
    try {
      for (var i = 0; i < allItems.length; i++) {
        //if (this.cacheSelectedLanguage.code !== languageCode) {
        //  if (allItems[i].FromLanguageCode == this.cacheSelectedLanguage.code && allItems[i].ToLanguageCode == languageCode && allItems[i].ElementContent == elementtextcontent
        //    && allItems[i].DataAutomationId == dataautomationid && allItems[i].ClassName == classname && allItems[i].ControlId == id && allItems[i].ElementStyle == elementstyle) {
        //    console.log("Data exists in List - Displaying data from list");
        //    returntext = allItems[i].Translatedtext;
        //  }
        //}
        //else {
          if (allItems[i].ToLanguageCode == languageCode && allItems[i].ElementContent == elementtextcontent
            && allItems[i].DataAutomationId == dataautomationid && allItems[i].ClassName == classname && allItems[i].ControlId == id && allItems[i].ElementStyle == elementstyle) {
            console.log("Data exists in List - Displaying data from list");
            returntext = allItems[i].Translatedtext;

            return returntext;
          }
        //}
      }
    } catch (error) {
      console.log(error);
      console.log("Error in CheckListData");
    }
    return returntext;
  }

  private AddToList = async (allItems: any[], id: string, dataautomationid: string, classname: string, languageCode: string, controltitle: string, translatedtext: string, elementstyle: string, elementtextcontent: string): Promise<void> => {
    
    try {
      const iar: IItemAddResult = await sp.web.lists.getByTitle("Translator Data List").items.add({
        Title: "Title",
        PageName: "HomePage",//this.pageUrl,
        ControlId: id,
        PropertyName: controltitle,
        Translatedtext: translatedtext,
        ToLanguageCode: languageCode,
        FromLanguageCode: this.cacheSelectedLanguage.code,
        DataAutomationId: dataautomationid,
        ClassName: classname,
        ElementStyle: elementstyle,
        ElementContent: elementtextcontent
      });
      console.log("Adding data To List From Language : " + this.cacheSelectedLanguage.code + " To Language : " + languageCode);
    } catch (error) {
      console.log(error);
      console.log("Error in AddToList");
    }
  }




  private _onReloadOriginal = () => {
    pnpStorage.local.delete("PnP_UserLanguageInfo");
    window.location.reload();
  }

}


