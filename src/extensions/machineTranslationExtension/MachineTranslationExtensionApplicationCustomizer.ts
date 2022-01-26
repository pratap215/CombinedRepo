import * as React from "react";
import * as ReactDOM from "react-dom";

import { sp } from "@pnp/sp/presets/all";

import { override } from '@microsoft/decorators';
import { BaseApplicationCustomizer, PlaceholderContent, PlaceholderName } from '@microsoft/sp-application-base';

import { TranslationBar } from "../components/TranslationBar";
import { ITranslationBarProps } from "../components/ITranslationBarProps";
import { ITranslationService } from "../../services/ITranslationService";
import { TranslationService } from "../../services/TranslationService";

export interface IMachineTranslationExtensionApplicationCustomizerProperties {
  // Check supported languages: https://docs.microsoft.com/en-us/azure/cognitive-services/translator/language-support
  supportedLanguages: string[];
  translatorApiKey: string;
  regionSpecifier: string;
}

/** A Custom Action which can be run during execution of a Client Side Application */
export default class MachineTranslationExtensionApplicationCustomizer
  extends BaseApplicationCustomizer<IMachineTranslationExtensionApplicationCustomizerProperties> {

  private _topPlaceholder: PlaceholderContent | undefined;
  private pushState: () => any = null;
  private isCurrentPageInEdiMode: boolean | false;

  @override
  public onInit(): Promise<void> {

    sp.setup(this.context);
    console.log("MachineTranslationExtensionApplicationCustomizer start");

    //this.checkCurrentPageMode();

    //this.context.placeholderProvider.changedEvent.add(this, () => {

    //  console.log("MachineTranslationExtensionApplicationCustomizer changedEvent");
    //  console.log(window.location.href);
    //});

    // Add navigation event to re-render
    this.context.application.navigatedEvent.add(this, () => {

      console.log("MachineTranslationExtensionApplicationCustomizer navigatedEvent");

      this.loadReactComponent();
    });

    this.render();

    console.log("MachineTranslationExtensionApplicationCustomizer end");

    return Promise.resolve();
  }

  private _onDispose(): void {
    console.log('[ReactHeaderFooterApplicationCustomizer._onDispose] Disposed custom top and bottom placeholders.');
    try {
      if (this._topPlaceholder && this._topPlaceholder.domElement) {
        ReactDOM.unmountComponentAtNode(this._topPlaceholder.domElement);
        console.log("MachineTranslationExtensionApplicationCustomizer dispose");
      }
    } catch (e) {
      console.log("_onDispose error " + e);
    }
  }


  private render() {
    console.log("MachineTranslationExtensionApplicationCustomizer render() start");
    try {
      if (this.context.placeholderProvider.placeholderNames.indexOf(PlaceholderName.Top) !== -1) {
        if (!this._topPlaceholder || !this._topPlaceholder.domElement) {
          this._topPlaceholder = this.context.placeholderProvider.tryCreateContent(PlaceholderName.Top, {
            onDispose: this.onDispose
          });
        }

        if (!this._topPlaceholder) {
          console.error('The expected placeholder (Top) was not found.');
          return;
        }
        console.log("MachineTranslationExtensionApplicationCustomizer render() loadReactComponent");

       // console.log(this, this.isCurrentPageInEdiMode);
        this.loadReactComponent();
      }
      else {
        console.log(`The following placeholder names are available`, this.context.placeholderProvider.placeholderNames);
      }
    } catch (e) {
      console.log("MachineTranslationExtensionApplicationCustomizer render() error " + e);
    }
    console.log("MachineTranslationExtensionApplicationCustomizer render() end");
  }

  /**
   * Start the React rendering of your components
   */
  private loadReactComponent() {
    console.log("MachineTranslationExtensionApplicationCustomizer loadReactComponent start");
    try {
      if (this.context.pageContext.listItem == undefined) {
        console.log("MachineTranslationExtensionApplicationCustomizer loadReactComponent listitem null");
        this._onDispose();
        return;
      }
    } catch (e) {
      console.log("MachineTranslationExtensionApplicationCustomizer loadReactComponent error1");
      console.log(e);

    }

    console.log("MachineTranslationExtensionApplicationCustomizer loadReactComponent2");
    try {
      if (this._topPlaceholder && this._topPlaceholder.domElement) {
        console.log("MachineTranslationExtensionApplicationCustomizer loadReactComponent2");
        const translationService: ITranslationService = this.properties.regionSpecifier
          ? new TranslationService(this.context.httpClient, this.context.spHttpClient, this.properties.translatorApiKey, `-${this.properties.regionSpecifier}`)
          : new TranslationService(this.context.httpClient, this.context.spHttpClient, this.properties.translatorApiKey);
        console.log("MachineTranslationExtensionApplicationCustomizer loadReactComponent3");
        // console.log(this.context.pageContext.listItem);
        const props: ITranslationBarProps = {
          supportedLanguages: this.properties.supportedLanguages,
          currentPageId: this.context.pageContext.listItem.id,
          currentListId: this.context.pageContext.list.id.toString(),
          currentWebUrl: this.context.pageContext.web.serverRelativeUrl,
          absoluteUrl: this.context.pageContext.web.absoluteUrl,
          pageContext: this.context.pageContext,
          translationService
        };
        console.log("MachineTranslationExtensionApplicationCustomizer loadReactComponent getTranslationPageMetaData");
        this.getTranslationPageMetaData(props, translationService).then(res =>
          this.renderComponent(res, props)
        );
      }
      else {
        console.log('DOM element of the header is undefined. Start to re-render.');
        this.render();
      }
    } catch (e) {
      console.log("MachineTranslationExtensionApplicationCustomizer loadReactComponent error2");
      console.log(e);
      this._onDispose();
    }
    console.log("MachineTranslationExtensionApplicationCustomizer loadReactComponent end");
  }

  private renderComponent(res: boolean, props: ITranslationBarProps) {
    if (this._topPlaceholder && this._topPlaceholder.domElement) {
      const elem: React.ReactElement<ITranslationBarProps> = React.createElement(TranslationBar, props);
      if (res) {
        console.log("renderComponent " + res);
        ReactDOM.render(elem, this._topPlaceholder.domElement);
      }
      else {
        console.log("Un mount");
        ReactDOM.unmountComponentAtNode(this._topPlaceholder.domElement);
      }
    }
    else {
      console.log('DOM element of the header is undefined. Start to re-render.');
      this.render();
    }
  }

  public async getTranslationPageMetaData(props: ITranslationBarProps, translationService: ITranslationService): Promise<boolean> {
    console.log('_renderPlaceHolders getTranslationPageMetaData ' + props.currentListId + '--' + props.currentPageId);
    try {
      const absoluteurl = props.absoluteUrl;
      const siteurl = `${absoluteurl}/_api/web/Lists/GetById('${props.currentListId}')/RenderListDataAsStream`;
      const result = await translationService.getSitePageLibraryInfo(siteurl, props.currentPageId.toString());

      if (!result.ok) {
        console.log('failed getTranslationPageMetaData');
        const resultData: any = await result.json();
        console.log(resultData.error);
        return false;
      }
      else {
        console.log("success getTranslationPageMetaData _renderPlaceHolders");
        const data: any = await result.json();
        // console.log(data);
        if (data && data.Row && data.Row.length > 0) {
          const row = data.Row[0];
          console.log("target page info");
          console.log(row);
          if (row["_SPIsTranslation"] == "Yes") {
            return true;
          }
        }
      }

    } catch (e) {
      console.log('error getTranslationPageMetaData _renderPlaceHolders');
      console.log(e);
      return false;
    }

    return false;
  }

  private checkCurrentPageMode(): void {
    console.log("called checkCurrentPageMode");
    try {
      if (!this.pushState) {
       
        this.pushState = () => {
          const defaultPushState = history.pushState;
         
          const self = this;
          return function (data: any, title: string, url?: string | null) {
            console.log("checkCurrentPageMode url :", url);
            if (url.toLowerCase().indexOf('mode=edit') !== -1) {
              self.isCurrentPageInEdiMode = true;
              self.loadReactComponent();
              console.log("editmode");
            }
            else {
              self.isCurrentPageInEdiMode = false;
              self._onDispose();
              console.log("checkCurrentPageMode other page");
            }
            return defaultPushState.apply(this, [data, title, url]);
          };
        };
        history.pushState = this.pushState();
      }
      else{
      
      }

    } catch (e) {
      console.log('error checkCurrentPageMode');
      console.log(e);

    }
  }







}
