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
import { textAreaProperties } from "office-ui-fabric-react";
import { IContextInfo } from '@pnp/sp/sites';
const pnpStorage = new PnPClientStorage();
//const { htmlToText } = require('html-to-text');

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

    //if (!selectedLanguage) {
    //  return (
    //    <div className={styles.translationBar}>
    //      <MessageBar messageBarType={MessageBarType.info}>
    //        {"Could not determine the language of the page. It is either not supported by the API or it is not enabled by your adminitrator."}
    //      </MessageBar>
    //    </div>
    //  );
    //}

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

    //console.log("cacheSelectedLanguage " + this.cacheSelectedLanguage.code);
    //console.log("selectedLanguage " + language.code);





    this.setState({ isTranslating: true });
    pnpStorage.local.put('PnP_UserLanguageInfo', language, dateAdd(new Date(), 'hour', 10));

    const relativePageUrl: string = `${this.props.currentWebUrl}/SitePages/${this.state.pageItem["FileLeafRef"]}`;

    var clientsideControls: ColumnControl<any>[] = [];

    sp.web.loadClientsidePage(relativePageUrl).then(async (clientSidePage: IClientsidePage) => {

      try {

        //const oContext: IContextInfo = await sp.site.getContextInfo();


        this.pageUrl = clientSidePage.data.url;
        //
        // const pageContext: any = (window as any)._spPageContextInfo;


        // Translate title
        //await this._translatePageTitle(clientSidePage.title, language.code);
        // console.log(JSON.stringify(clientSidePage.data));

        const top = sp.web.navigation.topNavigationBar;
        if (top != null && top.length > 0) {
          //await this._translatePageNav(top.toString, language.code);
        }
        //Get all text controls
        // var clientsideControls: ColumnControl<any>[] = [];
        clientSidePage.findControl((c) => {
          if (c instanceof ClientsideText) {
            clientsideControls.push(c);
          }
          else if (c instanceof ClientsideWebpart) {
            clientsideControls.push(c);
          }
          return false;
        });

        //const elementlist = document.querySelectorAll(`[data-sp-feature-instance-id]`);
        //elementlist.forEach(x =>

        // x.


        //);


        //await this._translateSiteHeaderTitle(language.code);

        await this._alltranslateClientSideControl(clientsideControls, language.code);

        this.setState({ isTranslating: false, isTranslated: true });
        this._updateSelectedLanguage(language);

        // await this._translateHorizontalMenu(language.code);
        if (this.isError) {
          throw new Error('Error in Translation');
        }


        //console.log(clientSidePage.data);

        await clientSidePage.save(true);


        console.log('page saved ');


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

  private _alltranslateClientSideControl = async (clientsideControls: ColumnControl<any>[], languageCode: string): Promise<void> => {

    console.log('Start _alltranslateClientSideControl');
    for (const control of clientsideControls) {
      await this._translateControl(control.id, languageCode);
    }
    console.log('End  _alltranslateClientSideControl');
  }




  //private _translateControl = async (textControl: ClientsideText, languageCode: string): Promise<void> => {
  private _translateControl = async (controlid: string, languageCode: string): Promise<void> => {
    console.log(' ');
    console.log("start  control id " + controlid);
    let element: Element = null;
    //(function () {
    //  element = document.querySelector(`[data-sp-feature-instance-id='${controlid}']`);
    //})();

    //document.addEventListener("DOMContentLoaded", function () {
    //  if (element == null) {
    //    console.log("DOMContentLoaded");

    //  }
    //});



    try {
      element = document.querySelector(`[data-sp-feature-instance-id='${controlid}']`);
      console.log(element);
      if (element && element.firstChild) {
        await this._translateHtmlElement(element.firstChild as Element, languageCode, controlid);
        console.log("end  control id " + controlid);
      } else {
        console.error(`_translateControl => Control with id: '${controlid}' not found!`);
        //await this._translateControlwithid(controlid, languageCode);
      }

    }
    catch (e) {
      console.dir(e);
      console.log('Error In _translateControl');
      //console.log(e);
      this.isError = true;
    }

  }

  private _translateControlwithid = async (controlid: string, languageCode: string): Promise<void> => {
    try {
      console.log('Start _translateControlwithid');
      const element = document.querySelector(`[id='${controlid}']`);
      console.log(element);
      if (element && element.firstChild) {
        await this._translateHtmlElement(element.firstChild as Element, languageCode, controlid);
      } else {
        console.error(`_translateControlwithid=> Control with id: '${controlid}' not found!`);
      }
      console.log('End _translateControlwithid');
    }
    catch (e) {
      console.dir(e);
      console.log('Error In _translateControlwithid');
      //console.log(e);
      this.isError = true;
    }
  }



  private _translateHtmlElement = async (element: Element, languageCode: string, controlid: string): Promise<void> => {


    // console.log('Start _translateHtmlElement ' + element.innerHTML.length);
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

          //const translationResult = await this.props.translationService.translate(sentenceToTranslate, languageCode, false);
          //const translatedText = translationResult.translations[0].text;

          const translationResult = await this.props.translationService.translatetotext(sentenceToTranslate, sentenceToTranslate, languageCode, false);
          const translatedText = translationResult;

          element.textContent = element.textContent.replace(
            sentenceToTranslate,
            translatedText
          );

          //  console.log("translatedText1");

          startIndex = endIndex;
        }
      }
    } else {

      if (element.innerHTML != null) {
        const elementtextcontent = element.textContent;
        if (typeof elementtextcontent != 'undefined' && elementtextcontent) {
          const innerHtml = element.innerHTML;
          const cachecontent = elementtextcontent.replace(/(\r\n|\n|\r)/gm, "") + controlid;
          const translationResult = await this.props.translationService.translatetotext(cachecontent, innerHtml, languageCode, true);
          element.innerHTML = translationResult;
        }
      }
    }
    //console.log('End _translateHtmlElement');
  }





  private _translatePageTitle = async (title: string, languageCode): Promise<void> => {
    console.log('Start _translatePageTitle');


    const pageTitle: Element = document.querySelector("div[data-automation-id='pageHeader'] div[role='heading']");
    if (pageTitle != undefined) {

      const translationResult = await this.props.translationService.translatetotext(pageTitle.innerHTML, pageTitle.innerHTML, languageCode, false);
      document.querySelector("div[data-automation-id='pageHeader'] div[role='heading']").innerHTML = translationResult;


    }
    console.log('End _translatePageTitle');
  }

  private _convertHTMLtoString = async (innerHTML): Promise<string> => {
    return await innerHTML.replace(/<[^>]+>/g, '');
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



  private _onReloadOriginal = () => {
    pnpStorage.local.delete("PnP_UserLanguageInfo");
    window.location.reload();
  }

}


