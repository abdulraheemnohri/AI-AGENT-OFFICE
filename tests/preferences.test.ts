import {describe,expect,it} from "vitest";
import {sanitizePreferences,type PreferenceDefaults} from "../src/lib/preferences";

const defaults:PreferenceDefaults={
  offline:true,theme:"dark",autosave:true,autosaveDelay:1000,fontSize:15,
  confirmOverwrite:true,telemetry:false,confirmRestore:true,defaultFormat:"Markdown (.md)",
  printPaper:"A4",printOrientation:"portrait",printMargins:15,csvDelimiter:",",
  spellCheck:true,spellLanguage:"en",density:"comfortable"
};

describe("sanitizePreferences",()=>{
  it("preserves valid persisted values",()=>{
    const value=sanitizePreferences(defaults,{theme:"light",fontSize:18,spellLanguage:"ur",csvDelimiter:";"});
    expect(value.theme).toBe("light");
    expect(value.fontSize).toBe(18);
    expect(value.spellLanguage).toBe("ur");
    expect(value.csvDelimiter).toBe(";");
    expect(sanitizePreferences(defaults,{csvDelimiter:"\t"}).csvDelimiter).toBe("\t");
  });
  it("rejects invalid enum and primitive values",()=>{
    const value=sanitizePreferences(defaults,{theme:"neon",autosave:"yes",density:"huge"});
    expect(value.theme).toBe("dark");
    expect(value.autosave).toBe(true);
    expect(value.density).toBe("comfortable");
  });
  it("clamps numeric settings and ignores unknown keys",()=>{
    const value=sanitizePreferences(defaults,{fontSize:999,autosaveDelay:-5,printMargins:100,unexpected:"unsafe"});
    expect(value.fontSize).toBe(24);
    expect(value.autosaveDelay).toBe(500);
    expect(value.printMargins).toBe(20);
    expect("unexpected" in value).toBe(false);
  });
  it("handles null, arrays and malformed input safely",()=>{
    expect(sanitizePreferences(defaults,null)).toEqual(defaults);
    expect(sanitizePreferences(defaults,["dark"])).toEqual(defaults);
  });
});
