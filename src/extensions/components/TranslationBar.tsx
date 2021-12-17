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
import * as _ from "lodash";
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/navigation";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/features";
import { ColumnControl, ClientsideText, ClientsideWebpart, IClientsidePage, ClientsidePageFromFile } from "@pnp/sp/clientside-pages";
import { ITranslationResult } from "../../models/ITranslationResult";
import { Navigation } from "@pnp/sp/navigation";
import { Guid } from "@microsoft/sp-core-library";
import { Dialog }   from '@microsoft/sp-dialog';
import { SPPermission } from '@microsoft/sp-page-context';
// import ProgressDialogContent from './../components/ProgressDialog';
import { DialogContent, Stack, Spinner, IStackTokens } from "office-ui-fabric-react";
import { DialogType, DialogFooter } from 'office-ui-fabric-react';
import { Dialog as D1} from 'office-ui-fabric-react'

const stackTokens: IStackTokens = {
  childrenGap: 20,
  // maxWidth: 250,
};
export class TranslationBar extends React.Component<ITranslationBarProps, ITranslationBarState> {

  private _pageName: string | undefined;
  private _listId: string | undefined;
  private _listItemId: string | undefined;
  private _targetPageurl: string | undefined;
  private _sourcePageurl: string | undefined;

  private _sPTranslationSourceItemId: Guid | undefined;
  private _sPTranslationLanguage: string | undefined;
  private _sPTranslatedLanguages: Array<string> | undefined;
  private buttonCaption: string = "---";
  // private _dialog: ProgressDialogContent;

  constructor(props: ITranslationBarProps) {
    super(props);

    this.state = {
      availableLanguages: [],
      selectedLanguage: undefined,
      pageItem: undefined,
      isLoading: true,
      isTranslated: false,
      isTranslating: false,
      globalError: undefined,
      userPermission: false,
      isDialogLoading: false,
      
    };
  }

  public async componentDidMount() {
    console.log('===========this.props.pageContext=========================');
    console.log(this.props.pageContext);
    console.log('====================================');
    this._initTranslationBar();
    this.setState({
      userPermission: this.props.pageContext.list.permissions.hasPermission(SPPermission.manageLists)
    })
  }
  public async componentDidUpdate(nextProps: ITranslationBarProps) {
    if (nextProps.currentPageId !== this.props.currentPageId) {
      // Set original state
      this.setState({
        availableLanguages: [],
        selectedLanguage: undefined,
        pageItem: undefined,
        isLoading: false,
        isTranslated: false,
        isTranslating: false,
        globalError: undefined
      }, () => this._initTranslationBar());
    }
  }

  public render(): JSX.Element {

    console.log('render');
    const { availableLanguages, globalError, selectedLanguage, isLoading, isTranslated } = this.state;

    //if (isLoading) {
    //  return (
    //    <div className={styles.translationBar}>
    //      <div className={styles.loadingButton}>Translation Bar ...</div>
    //    </div>
    //  );
    //}

    //if (globalError) {
    //  return (
    //    <div className={styles.translationBar}>
    //      <MessageBar messageBarType={MessageBarType.error}>
    //        {globalError}
    //      </MessageBar>
    //    </div>
    //  );
    //}

    console.log(!isTranslated);
   
      return (
        <>
        {
          this.state.userPermission ? 
          <>
            <div className={styles.translationBar}>
              <ActionButton
                className={styles.actionButton}
                text={globalError}
                disabled={!isTranslated}
                onClick={() => this._onTranslateCurrentPage()}
              
              />
            </div>
            {
            this.state.isDialogLoading ? 
            <D1
            hidden={false}
            // onDismiss={toggleHideDialog}
            dialogContentProps={
              {
                type: DialogType.normal,
                title: 'Translation',
                subText: '',
              }
            }
            modalProps={
              {
                isBlocking: true,
                styles: { main: { maxWidth: 450 } },
              }
            }
          >
                        <Stack tokens={stackTokens}>
      <div>
        <Spinner label="Working on it..." />
      </div>
      </Stack>
            <DialogFooter>

            </DialogFooter>
          </D1>
            :
            ""
          }
          </>
          :
          <>
          </>

        }
      
      </>
      );
    //}
    //else {
    //  console.log('cannot render');
    //}
  }

  private _initTranslationBar = async (): Promise<void> => {
    console.log("_initTranslationBar");
    const pageItem = await this._getPageItem();
    this._pageName = pageItem["FileLeafRef"];

    const isvalid = await this.getTranslationPageMetaData();
    let buttonCaption: string = "";
    if (isvalid) {
      buttonCaption = "Click here to Translate this page" //to [" + this.getLanguageName(this._sPTranslationLanguage) + "]";
    }
    

    this.setState({
      isLoading: false,
      isTranslated: isvalid,
      isTranslating: false,
      globalError: buttonCaption
    });

  }

  private _getPageItem = async (): Promise<any> => {

    console.log("_getPageItem");

    const page = await sp.web.lists
      .getById(this.props.currentListId)
      .items
      .getById(this.props.currentPageId)
      .select("Title", "FileLeafRef", "FileRef", "Description", "ID").get();

    console.log(this.props.currentListId);
    console.log(this.props.currentPageId);
    console.log(page);

    console.log(page["ID"]);

    this._listId = this.props.currentListId;
    this._listItemId = this.props.currentPageId.toString();
    return page;

  }
  
  //NEW Code Start


  private _onTranslateCurrentPage = (): void => {
    console.log('_onTranslate start');

    (async () => {
      try {

      
        if (confirm('Are you sure you want to translate this page[' + this._pageName + ']')) {

          const isValidTargetFile = await this.getTranslationPageMetaData();

          console.log(this._targetPageurl);

          if (isValidTargetFile == false) {
            Dialog.alert('Not a Translated Page.Contact Admin');
            return;
          }

          const isValidSourceFile = await this.getSourcePageMetaData(this._sPTranslationSourceItemId);

          if (isValidSourceFile == false) {
            Dialog.alert('Original page not exists.Contact Admin');
            return;
          }

          this.setState({
            isLoading: true,
            isDialogLoading: true
            
          });

          console.log('Copying......... ');
          // const sourceRelativePageUrl: string = '/SitePages/' + this._pageName;
          const sourceRelativePageUrl: string = this._sourcePageurl;
          let sourcepage: IClientsidePage = undefined;
          try {
            sourcepage = await ClientsidePageFromFile(sp.web.getFileByServerRelativeUrl(sourceRelativePageUrl));
          } catch (error) {
            console.dir(error);
            console.log('source page not found ' + this._pageName);
            Dialog.alert('Original page [' + this._pageName + '] not exists.Contact Admin');
            return;
          }
          console.log('async/await source -> ', sourcepage);

          if (sourcepage != undefined) {

            this.setState({
              isLoading: false,
              isTranslated: false,
              isTranslating: false,
              globalError: "Translating........... "
            });

            const languagecode: string = this._sPTranslationLanguage;

            // const targetRelativePageUrl: string = '/SitePages/' + languagecode + '/' + this._pageName;
            const targetRelativePageUrl: string = this._targetPageurl;
            const targetpage = await ClientsidePageFromFile(sp.web.getFileByServerRelativeUrl(targetRelativePageUrl));
            await sourcepage.copyTo(targetpage, true);

            console.log('Copy Completed.......');

            // Dialog.alert(`Starting Translation............ ` + languagecode);

            await new Promise(resolve => setTimeout(resolve, 5000));

            sp.web.loadClientsidePage(targetRelativePageUrl).then(async (clientSidePage: IClientsidePage) => {

              try {
                console.log('translation started');

                var clientControls: ColumnControl<any>[] = [];
                clientSidePage.findControl((c) => {
                  if (c instanceof ClientsideText) {
                    clientControls.push(c);
                  }
                  else if (c instanceof ClientsideWebpart) {
                    clientControls.push(c);
                  }
                  return false;
                });

                await this._alltranslateClientSideControl(clientControls, languagecode);

                //const nav = sp.web.navigation.topNavigationBar;
                //Dialog.alert(nav.length.toString());
                //const childrenData = await nav.getById(1).children();
                //await nav.getById(1).update({
                //    Title: "A new title",
                //});

                //clientSidePage.title = this._getTranslatedText(clientSidePage.title, languagecode, false);

                clientSidePage.save();

                console.log('translation complete');

                Dialog.alert(`Translation Completed........`);

                this.setState({
                  isLoading: false,
                  isTranslated: isValidTargetFile,
                  isTranslating: false,
                  isDialogLoading: false,
                  globalError: "Click here to Translate this page" // to [" + this.getLanguageName(languagecode) + "]"
                });

                

              } catch (error) {
                console.dir(error);
                this.setState({
                  isDialogLoading: false
                })

              }
            }).catch((error: Error) => {
              console.dir(error);
              this.setState({
                isDialogLoading: false
              })
            });

          }
        }

      } catch (err) {
        console.dir('aynsc error');
        console.log(err);
        this.setState({
          isDialogLoading: false
        })
      }
      

    })();

    this.setState({
      isLoading: false,
      isDialogLoading: false
    });
  }

  private _alltranslateClientSideControl = async ( clientsideControls: ColumnControl<any>[], languagecode: string): Promise<void> => {
    try {
      for (const c of clientsideControls) {
        if (c instanceof ClientsideWebpart) {
          if (c.data.webPartData) {
            if (c.data.webPartData.serverProcessedContent) {
              if (c.data.webPartData.serverProcessedContent.searchablePlainTexts) {
                let propkeys = Object.keys(c.data.webPartData.serverProcessedContent.searchablePlainTexts);
                for (const key of propkeys) {
                  const propvalue = c.data.webPartData.serverProcessedContent.searchablePlainTexts[key];
                  if (propvalue) {
                    //let translationResult = await translationService.translate(propvalue, languagecode, false);
                    let translationResult = await this.props.translationService.translate(propvalue, languagecode, false);
                    const translatedText = translationResult.translations[0].text;
                    c.data.webPartData.serverProcessedContent.searchablePlainTexts[key] = translatedText;
                  }
                }
              }
            }
          }
        }
        else if (c instanceof ClientsideText) {
          const propvalue = c.text;
          if (propvalue) {
            let translationResult = await this.props.translationService.translate(propvalue, languagecode, true);
            const translatedText = translationResult.translations[0].text;
            c.text = translatedText;
          }
        }
      }
    } catch (err) {
      console.dir('aynsc error');
      console.log(err);

    }
  }

  //private _getTranslatedText = (text: string, languagecode: string, asHtml: boolean): string => {


  //    let translatedText: string = "";
  //    if (text) {
  //        // console.log('start');
  //        const translationService: ITranslationService = environment.config.regionSpecifier
  //            ? new TranslationService(this.context.httpClient, environment.config.translatorApiKey, `-${environment.config.regionSpecifier}`)
  //            : new TranslationService(this.context.httpClient, environment.config.translatorApiKey);

  //        //TODO : uncomment the below code 
  //        //(async () => {

  //        //    let translationResult = await translationService.translate(text, languagecode, asHtml);
  //        //    translatedText = translationResult.translations[0].text

  //console.log('end');

  //return translatedText;
  //}
  //*************Function to get Multilingual Feature Enabled************************************* */
  public getMultiLingualFeatureEnabled = (): Promise<boolean> => {
    return new Promise<boolean>(async (resolve, reject) => {
      let features = await sp.web.features.select("DisplayName", "DefinitionId").get().then(f => {
        if (_.find(f, { "DisplayName": "MultilingualPages" })) {
          return resolve(true);
        }
        else {
          return resolve(false);
        }
        //test comment for push

      }).catch(error => {
        console.log(error);
        return reject(false);
      });
      return resolve(false);
    });

  }


  //Metadata start

  public async getTranslationPageMetaData(): Promise<boolean> {
    console.log('getTranslationPageMetaData ' + this._listId + '--' + this._listItemId);
    console.log(this.props.absoluteUrl);
    try {
      //const siteurl = `https://8p5g5n.sharepoint.com/_api/web/Lists/GetById('${this._listId}')/RenderListDataAsStream`;
      const absoluteurl = this.props.absoluteUrl;
      const siteurl = `${absoluteurl}/_api/web/Lists/GetById('${this._listId}')/RenderListDataAsStream`;
      const result = await this.props.translationService.getSitePageLibraryInfo(siteurl,  this._listItemId);

      if (!result.ok) {
        console.log('failed getTranslationPageMetaData');
        const resultData: any = await result.json();
        console.log(resultData.error);
        return false;
      }
      else {
        console.log("success getTranslationPageMetaData");
        const data: any = await result.json();
        // console.log(data);
        if (data && data.Row && data.Row.length > 0) {
          const row = data.Row[0];
          console.log("target page info");
          console.log(row);
          if (row["_SPIsTranslation"] == "Yes") {
            //  this._sPTranslationSourceItemId = row["_SPTranslationSourceItemId"].toString().replace("{", "").replace("}", "").trim();
            this._sPTranslationSourceItemId = row["_SPTranslationSourceItemId"].toString();
            this._sPTranslationLanguage = row["_SPTranslationLanguage"];
            this._targetPageurl = row["FileRef"];

            //console.log(Object.keys(row));
            return true;
          }
        }
      }

    } catch (e) {
      console.log('error getTranslationPageMetaData');
      console.log(e);
      return false;
    }

    return false;
  }



  public async getSourcePageMetaData(pageid: Guid): Promise<boolean> {
    console.log("");
    console.log('getSourcePageMetaData :' + this._listId + '-- page id ' + pageid);

   // console.log(this.context.pageContext.web.absoluteUrl);

    // const uniqid = "{9956AB6B-9C81-4448-88D3-634BC9536D34}";
    //var currentPageUrl = this.context.pageContext.site.serverRequestPath;

    //sp.web.lists.getByTitle("Site Pages").items.get().then((items: any[]) => {
    //   console.log(items[0]);
    //});

    //sp.web.lists.getById("${this._listId}").items.get().then((items: any[]) => {
    //    console.log(items[0]);
    //});

    //const siteAssetsList = await sp.web.lists.ensureSitePagesLibrary();
    //const r = await siteAssetsList.select("Title")();
    //    console.log(r);

    try {
     // const siteurl = `https://8p5g5n.sharepoint.com/_api/web/Lists/GetById('${this._listId}')/RenderListDataAsStream`;
      const absoluteurl = this.props.absoluteUrl;
      const siteurl = `${absoluteurl}/_api/web/Lists/GetById('${this._listId}')/RenderListDataAsStream`;
      const result = await this.props.translationService.getSitePageLibraryInfoByUniqueId(siteurl, pageid);
      if (!result.ok) {
        console.log('failed getSourcePageMetaData');
        const resultData: any = await result.json();
        console.log(resultData.error);
        return false;
      }
      else {
        console.log("success getSourcePageMetaData2");
        const data: any = await result.json();
        // console.log(data);
        if (data && data.Row && data.Row.length > 0) {
          const row = data.Row[0];
          console.log("source page info");
          console.log(row);
          this._sourcePageurl = row["FileRef"];
          this._sPTranslatedLanguages = row["_SPTranslatedLanguages"];
          console.log(this._sPTranslatedLanguages);
          return true;
        }
      }

    } catch (e) {
      console.log('error getTranslationPageMetaData');
      console.log(e);
      return false;
    }

    return false;
  }

  private getLanguageName(code: string): string {
    console.log("getLanguageName " + code);
    const regionalLanguages = `{"ar-sa":"Arabic",
"az-latn-az":"Azerbaijani",
"eu-es":"Basque",
"bs-latn-ba":"Bosnian (Latin)",
"bg-bg":"Bulgarian",
"ca-es":"Catalan",
"zh-cn":"Chinese (Simplified)",
"zh-tw":"Chinese (Traditional)",
"hr-hr":"Croatian",
"cs-cz":"Czech",
"da-dk":"Danish",
"prs-af":"Dari",
"nl-nl":"Dutch",
"en-us":"English",
"et-ee":"Estonian",
"fi-fi":"Finnish",
"fr-fr":"French",
"gl-es":"Galician",
"de-de":"German",
"el-gr":"Greek",
"he-il":"Hebrew",
"hi-in":"Hindi",
"hu-hu":"Hungarian",
"id-id":"Indonesian",
"ga-ie":"Irish",
"it-it":"Italian",
"ja-jp":"Japanese",
"kk-kz":"Kazakh",
"ko-kr":"Korean",
"lv-lv":"Latvian",
"lt-lt":"Lithuanian",
"mk-mk":"Macedonian",
"ms-my":"Malay",
"nb-no":"Norwegian (Bokmål)",
"pl-pl":"Polish",
"pt-br":"Portuguese (Brazil)",
"pt-pt":"Portuguese (Portugal)",
"ro-ro":"Romanian",
"ru-ru":"Russian",
"sr-cyrl-rs":"Serbian (Cyrillic, Serbia)",
"sr-latn-cs":"Serbian (Latin)",
"sr-latn-rs":"Serbian (Latin, Serbia)",
"sk-sk":"Slovak",
"sl-si":"Slovenian",
"es-es":"Spanish",
"sv-se":"Swedish",
"th-th":"Thai",
"tr-tr":"Turkish",
"uk-ua":"Ukrainian",
"vi-vn":"Vietnamese",
"cy-gb":"Welsh"}`;

    const languageNames = JSON.parse(regionalLanguages);

    console.log("getLanguageName name " + languageNames["de-de"]);

    return languageNames[code.toLowerCase()];

  }


  //Metadata end



  //NEW Code End




}
