import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import { ClientsideWebpart } from "@pnp/sp/clientside-pages";
import { ITypedHash } from "@pnp/common";

// we create a class to wrap our functionality in a reusable way
export class CWebPart extends ClientsideWebpart {

  constructor(control: ClientsideWebpart) {
    super((<any>control).json);
  }

  // add property getter/setter for what we need, in this case "listTitle" within searchablePlainTexts
  public get DisplayTitle(): string {

    const wdata =this.json.webPartData;
    if (wdata !== null && wdata !== undefined)
    {
      const spc = wdata.serverProcessedContent;
      if (spc !== null && spc !== undefined)
      {
        //const spt: ITypedHash<string> = spc.searchablePlainTexts;
        const spt = spc.searchablePlainTexts;
        if (spt !== null && spt !== undefined)
        {

           //console.log(spt.length);


            return spt.title;
        }
      }
    }
    return  "";
    //return this.json.webPartData?.serverProcessedContent?.searchablePlainTexts?.listTitle || "";
  }


  public set DisplayTitle(value: string) {
    this.json.webPartData.serverProcessedContent.searchablePlainTexts.title = value;
  }

  // public set DisplayTitlecontenttitle(value: string) {
  //   this.json.webPartData.serverProcessedContent.searchablePlainTexts.content[0].title = value;
  // }

  public set Title(value: string) {
    this.json.webPartData.title = value;
  }

  public get Title(): string {
    const wdata =this.json.webPartData;
    if (wdata !== null && wdata !== undefined)
    {
      const spc = wdata.title;
      if (spc !== null && spc !== undefined)
      {
            return spc;
      }
    }
    return  "";
  }
}
