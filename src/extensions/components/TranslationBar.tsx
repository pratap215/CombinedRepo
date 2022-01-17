import * as React from "react";
import styles from "./TranslationBar.module.scss";

import { ITranslationBarProps } from "./ITranslationBarProps";
import { ITranslationBarState } from "./ITranslationBarState";

import { ActionButton, DefaultButton, PrimaryButton } from "office-ui-fabric-react/lib/Button";
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
import { BaseDialog, Dialog, IDialogConfiguration } from '@microsoft/sp-dialog';
import { SPPermission } from '@microsoft/sp-page-context';
// import ProgressDialogContent from './../components/ProgressDialog';
import { DialogContent, Stack, Spinner, IStackTokens, IDialogContentStyles } from "office-ui-fabric-react";
import { DialogType, DialogFooter } from 'office-ui-fabric-react';
import { Dialog as D1 } from 'office-ui-fabric-react';
import { Dialog as D2 } from 'office-ui-fabric-react';
import * as ReactDOM from "react-dom";
import { environment } from "../../environments/environment";
import { ITranslationService } from "../../services/ITranslationService";
import { TranslationService } from "../../services/TranslationService";
import { HttpClient, HttpClientConfiguration } from "@microsoft/sp-http";

const dStyle = {
  subText: {
    fontSize: '18px'
  }
};
export class ConfirmDialogContent extends React.Component<any, any>  {
  public labelName: string;
  constructor(props) {
    super(props);
    this.state = {
      showDialog: true,
    };

  }

  public componentDidMount() {

    window.top.addEventListener('beforeunload', (event) => {
      event.preventDefault();
      event.returnValue = null;
    });
    // Sleep in loop
    // sp.web.lists.getByTitle('kkkk').items.getAll().then(res => {
    //   console.log(res[0]['ID']);
    //   this.setState({
    //     Progress: 0.5
    //   });
    //   console.log('hh');
    // });
    // commented this for loop for testing on 16/12
    // for (let i = 2; i < 11; i++) {
    //     setTimeout(() => {
    //         this.setState({
    //             Progress: i / 10
    //         });

    //         if (this.state.Progress == 1) {
    //             this.props.close();
    //         }

    //     }, 1000);
    // }
  }
  // public componentWillUnmount(): void {
  //   window.removeEventListener('beforeunload', (event) => {
  //     event.preventDefault();
  //     event.returnValue = null
  //   });
  // }
  public render() {
    return (
      this.state.showDialog ?
        <>
          <DialogContent
            type={DialogType.normal}
            title='Translation'
            subText={`You are about to overwrite the content on this page with \nan automatic translation of the original language. Please confirm`}
            showCloseButton={false}
            isMultiline={true}
            className={styles.dialogTitle}
            styles={dStyle}
          >

            <DialogFooter>
              <PrimaryButton onClick={() => {
                //this.ceb._onTranslate()
                this.props.submit("Yes");

              }}>Yes
              </PrimaryButton>
              <DefaultButton onClick={() => {
                this.props.submit("No");

              }}>No
              </DefaultButton>
            </DialogFooter>
          </DialogContent>
        </>
        :
        null


    );
  }

}

export default class ConfirmDialog extends BaseDialog {
  public initprogress: number;
  public labelname: string;
  public description: string;

  constructor() {
    super({ isBlocking: true });

  }

  public render(): void {
    ReactDOM.render(<ConfirmDialogContent
      // DefaultProgress={this.initprogress}
      // close={this.close}
      labelname={this.labelname}
      submit={this._submit}
    // description={this.description}

    />, this.domElement);
  }

  public getConfig(): IDialogConfiguration {
    return {
      isBlocking: true
    };
  }
  protected onAfterClose(): void {
    super.onAfterClose();

    // Clean up the element for the next dialog
    ReactDOM.unmountComponentAtNode(this.domElement);
  }
  private _submit = (labelName: string) => {
    this.labelname = labelName;
    this.close();
  }
}




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
  private _confirmDialog: ConfirmDialog;
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
      showConfirmationDialog: false,

    };
    this._confirmDialog = new ConfirmDialog();

    //console.log(document.location.href.indexOf("Mode=Edit") !== -1);
  }

  public async componentDidMount() {
    console.log('===========this.props.pageContext=========================');
    console.log(this.props.pageContext);
    console.log('====================================');
    this._initTranslationBar();
    this.setState({
      userPermission: this.props.pageContext.list.permissions.hasPermission(SPPermission.manageLists)
    });
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

  public onActionClick = async () => {
    const isTranslatePageCheckedOut = await this.getPageMode(this._listItemId);
    if (isTranslatePageCheckedOut == false) {
      return;
    }
    this._confirmDialog.show().then(() => {
      if (this._confirmDialog.labelname === "Yes") {
        this._onTranslateCurrentPage();
      }
      else {
        console.log("No");
        return;
      }
    });
    // this.setState({
    //   showConfirmationDialog: true,
    // })
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
                  // onClick={() => this._onTranslateCurrentPage()}
                  onClick={() => this.onActionClick()}

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
                        title: 'Translation...',
                        subText: 'Translation in progress. Please do not close this browser window or use the back button.',
                        styles: dStyle
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
      buttonCaption = "Auto-translate from original to [" + this.getLanguageName(this._sPTranslationLanguage) + "]";
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

        // const isTranslatePageCheckedOut = await this.getPageMode(this._listItemId);
        // if (isTranslatePageCheckedOut == false) {
        //   return;
        // }
        //if (confirm('You are about to overwrite the content on this page with an automatic translation of the original language. Please confirm')) {

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
            globalError: "Translation in progress. Please do not close this browser window or use the back button "
          });

          const languagecode: string = this._sPTranslationLanguage;

          // const targetRelativePageUrl: string = '/SitePages/' + languagecode + '/' + this._pageName;
          const targetRelativePageUrl: string = this._targetPageurl;
          const targetpage = await ClientsidePageFromFile(sp.web.getFileByServerRelativeUrl(targetRelativePageUrl));
          await sourcepage.copyTo(targetpage, false);

          console.log('Copy Completed.......');

          // Dialog.alert(`Starting Translation............ ` + languagecode);

          await new Promise(resolve => setTimeout(resolve, 5000));

          // sp.web.loadClientsidePage(targetRelativePageUrl).then(async (clientSidePage: IClientsidePage) => {

          try {
            console.log('translation started');

            var clientControls: ColumnControl<any>[] = [];
            targetpage.findControl((c) => {
              if (c instanceof ClientsideText) {
                clientControls.push(c);
              }
              else if (c instanceof ClientsideWebpart) {
                clientControls.push(c);
              }
              return false;
            });



            await this._alltranslateClientSideControl(clientControls, languagecode);

            await this._getTranslatedTitle(sourcepage.title, languagecode, false)
              .then(text => {
                if (text) targetpage.title = text;
              });

            await this.translateSectionHeader(targetpage, languagecode);


            //const nav = sp.web.navigation.topNavigationBar;
            //Dialog.alert(nav.length.toString());
            //const childrenData = await nav.getById(1).children();
            //await nav.getById(1).update({
            //    Title: "A new title",
            //});

            // targetpage.title = this._getTranslatedText(targetpage.title, languagecode, false);
            //targetpage.title = "dfdfd"
            // let translationPageTitle = await this.props.translationService.translate(targetpage.title, languagecode, false);
            // //targetpage.title = translationPageTitle
            // console.log('=============translationPageTitle=======================');
            // console.log(translationPageTitle);
            // console.log('====================================');
            targetpage.save(false);

            const isCheckedOut = await this.getPageMode(this._listItemId);
            console.log('==========isCheckedOut==========================');
            //console.log(isCheckedOut);

            if (isCheckedOut) {
              await sp.web.getFileByServerRelativeUrl(`${this._targetPageurl}`).checkin("Automated Translation");
            }
            console.log('====================================');
            console.log('translation complete');



            Dialog.alert(`Translation finished. You can now continue editing.`).then(() => {
              window.top.onbeforeunload = null;
              window.location.replace(this.props.pageContext.site.absoluteUrl + "/" + this.props.pageContext.site.serverRequestPath);
            });

            this.setState({
              isLoading: false,
              isTranslated: isValidTargetFile,
              isTranslating: false,
              isDialogLoading: false,
              globalError: "Auto-translate from original to [" + this.getLanguageName(this._sPTranslationLanguage) + "]"
            });



          } catch (error) {
            console.dir(error);
            this.setState({
              isDialogLoading: false
            });

          }
          //}).catch((error: Error) => {
          //  console.dir(error);
          //  this.setState({
          //    isDialogLoading: false
          //  });
          //});

        }
        //}

      } catch (err) {
        console.dir('_onTranslate async error');
        console.log(err);
        this.setState({
          isDialogLoading: false
        });
        Dialog.alert(`Error in Translation`);

        this.setState({
          isLoading: false,
          isTranslated: false,
          isTranslating: false,
          globalError: "Error Translating Original file " + err
        });
      }


    })();

    this.setState({
      isLoading: false,
      isDialogLoading: false
    });
  }

  private _getTranslatedTitle = async (title: string, languagecode: string, asHtml: boolean): Promise<string> => {
    let titleTranslate: string = '';
    try {
      let te = await this.props.translationService.translate(title, languagecode, false);
      titleTranslate = te.translations[0].text;
      return Promise.resolve(titleTranslate);
    } catch (err) {
      return Promise.resolve('');
    }

  }

  private _alltranslateClientSideControl = async (clientsideControls: ColumnControl<any>[], languagecode: string): Promise<void> => {
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

            if (c.data.webPartData.properties) {
              let propkeys = Object.keys(c.data.webPartData.properties);
              for (const key of propkeys) {
                if (key == 'description' || key == 'buttonText' || key == 'overlayText' || key == 'title') {
                  const propvalue = c.data.webPartData.properties[key];
                  // console.log(propvalue);
                  let translationResult = await this.props.translationService.translate(propvalue, languagecode, false);
                  const translatedText = translationResult.translations[0].text;
                  c.data.webPartData.properties[key] = translatedText;
                }
              }

            }//properties

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

  // private _getTranslatedText = async (text: string, languagecode: string, asHtml: boolean): Promise<string> => {


  //    let translatedText: string = "";
  //    if (text) {
  //        console.log('_getTranslatedText start');
  //        const translationService: ITranslationService = environment.config.regionSpecifier
  //        ? new TranslationService(this.context.httpClient, this.context.spHttpClient, environment.config.translatorApiKey, `-${environment.config.regionSpecifier}`)
  //        : new TranslationService(this.context.httpClient, this.context.spHttpClient, environment.config.translatorApiKey);




  //        //TODO : uncomment the below code
  //        //(async () => {

  //           let translationResult = await translationService.translate(text, languagecode, asHtml);
  //           translatedText = translationResult.translations[0].text

  // console.log('end');

  // return translatedText;
  // }
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


  private async translateSectionHeader(targetpage: IClientsidePage, languagecode: string) {
    console.log('translateSectionHeader ');
    try {

      for (const section of targetpage.sections) {
        const colLength = section.columns.length;
        for (let i = 0; i <= colLength; i++) {
          if (section.columns[i]) {
            for (const control of section.columns[i].controls) {
              if (control.data) {
                if (control.data.controlType == '4') {

                  // console.log(control.data.zoneGroupMetadata);
                  let propkeys = Object.keys(control.data.zoneGroupMetadata);
                  for (const key of propkeys) {
                    if (key == 'displayName') {
                      const propvalue = control.data.zoneGroupMetadata[key];
                      if (propvalue) {
                        let translationResult = await this.props.translationService.translate(propvalue, languagecode, false);
                        const translatedText = translationResult.translations[0].text;
                        control.data.zoneGroupMetadata[key] = translatedText;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

    } catch (e) {
      console.log('error translateSectionHeader');
      console.log(e);

    }
  }

  //Metadata start

  public async getTranslationPageMetaData(): Promise<boolean> {
    console.log('getTranslationPageMetaData ' + this._listId + '--' + this._listItemId);
    console.log(this.props.absoluteUrl);
    try {
      //const siteurl = `https://8p5g5n.sharepoint.com/_api/web/Lists/GetById('${this._listId}')/RenderListDataAsStream`;
      const absoluteurl = this.props.absoluteUrl;
      const siteurl = `${absoluteurl}/_api/web/Lists/GetById('${this._listId}')/RenderListDataAsStream`;
      const result = await this.props.translationService.getSitePageLibraryInfo(siteurl, this._listItemId);

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

  public async getPageMode(pageId: string): Promise<boolean> {
    console.log("");
    console.log('tsx getPageMode :' + pageId);
    try {
      const absoluteurl = this.props.absoluteUrl;
      const restApi = `${absoluteurl}/_api/sitepages/pages(${pageId})/checkoutpage`;

      const result = await this.props.translationService.getPageMode(restApi);

      if (result) {
        Dialog.alert(result);
        return false;
      }
      else {
        return true;
      }
    } catch (e) {
      console.log('error tsx getPageMode');
      console.log(e);
      return false;
    }
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

    // console.log("getLanguageName name " + languageNames[code.toLowerCase()]);

    return languageNames[code.toLowerCase()];

  }


  //Metadata end



  //NEW Code End




}
