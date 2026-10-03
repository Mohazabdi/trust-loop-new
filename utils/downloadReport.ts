import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { toast } from "sonner-native";

export async function downloadReport(html: string, filename: string) {
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: filename,
        UTI: "com.adobe.pdf",
      });
    } else {
      toast.info("Sharing is not available on this device");
    }
  } catch (error) {
    toast.error(`Failed to generate report: ${error}`);
  }
}