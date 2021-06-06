interface ISysInfo {
  serverName: string,
  version: string,
  schemaVersion: string,
  supportedFeatures: string[],
  supportedComponents: string[],
  clientFlags: string[],
  paths: {
    emojiURL?: string
    pfpURL?: string
    bannerURL?: string
    graphQLEndpoint: string
  }
}

class SysInfo {
  public static sysInfo: ISysInfo = {
    serverName: "starship-server",
    version: "alpha (0.9-wip)",
    schemaVersion: "0.9-wip",
    supportedFeatures: ["users", "reports", "planets", "invites", "profiles", "notifications"],
    supportedComponents: ["pages", "wikis", "forums", "files"],
    clientFlags: [],
    paths: {
      graphQLEndpoint: "/graphql"
    }
  };

  public static generateSysInfo = function(): void {
    SysInfo.generateSysInfoFlags();
    SysInfo.generateSysInfoData();
  }

  public static generateSysInfoFlags = function(): void {
    // update client flags
    if(!process.env.BUCKET_ENDPOINT) {
      SysInfo.sysInfo.clientFlags.push("-upload");
    }
    
    if(process.env.RECAPTCHA_SECRET) {
      SysInfo.sysInfo.clientFlags.push("+recaptcha");
    }
    
    if(process.env.REDIS_SERVER) {
      SysInfo.sysInfo.clientFlags.push("+lowcapacity");
    }
    
    if(process.env.SMTP_HOST) {
      SysInfo.sysInfo.clientFlags.push("+emailverify");
    }
    
    if(process.env.DEVELOPMENT) {
      SysInfo.sysInfo.clientFlags.push("+development");
    }
  }

  public static generateSysInfoData = function(): void {
    if(process.env.BUCKET_ENDPOINT) {
      SysInfo.sysInfo.paths.emojiURL = `${process.env.BUCKET_ENDPOINT}/${process.env.BUCKET_NAME}/customemojis/`;
      SysInfo.sysInfo.paths.pfpURL = `${process.env.BUCKET_ENDPOINT}/${process.env.BUCKET_NAME}/profilepictures/`;
      SysInfo.sysInfo.paths.bannerURL = `${process.env.BUCKET_ENDPOINT}/${process.env.BUCKET_NAME}/profilebanners/`;
    }
  }

  public static querySysInfo = function(): ISysInfo {
    return SysInfo.sysInfo;
  }
}

export default SysInfo;