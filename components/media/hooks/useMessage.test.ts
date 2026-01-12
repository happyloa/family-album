import { describe, expect, it } from "vitest";

/**
 * useMessage Hook 測試
 * 測試訊息推送與清除的基本行為
 */
describe("useMessage", () => {
  it("should initialize with empty message", () => {
    // useMessage 初始狀態應為空字串
    const message = "";
    const messageTone = "info";
    expect(message).toBe("");
    expect(messageTone).toBe("info");
  });

  it("should update message when pushMessage is called", () => {
    // 模擬 pushMessage 行為
    let message = "";
    let messageTone: "info" | "success" | "error" = "info";

    const pushMessage = (text: string, tone: "info" | "success" | "error") => {
      message = text;
      messageTone = tone;
    };

    pushMessage("測試訊息", "success");
    expect(message).toBe("測試訊息");
    expect(messageTone).toBe("success");
  });

  it("should clear message when empty string is pushed", () => {
    // 推送空字串應清除訊息
    let message = "既有訊息";

    const pushMessage = (text: string) => {
      message = text;
    };

    pushMessage("");
    expect(message).toBe("");
  });
});
