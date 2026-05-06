export interface PixParams {
  key: string;
  name: string;
  city: string;
  amount: number;
  description?: string;
  transactionId?: string;
}

export function generatePixPayload({
  key,
  name,
  city,
  amount,
  transactionId = "***"
}: PixParams): string {
  
  const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, "0");
    return `${id}${len}${value}`;
  };

  // Merchant Account Info (ID 26)
  const merchantAccountInfo = [
    formatField("00", "br.gov.bcb.pix"),
    formatField("01", key),
  ].join("");

  // Additional Data (ID 62) -> Reference Label (ID 05)
  const referenceLabel = formatField("05", transactionId.substring(0, 25));
  const additionalData = formatField("62", referenceLabel);

  const payload = [
    formatField("00", "01"), // Payload Format Indicator
    formatField("01", "11"), // Point of Initiation (11 = static)
    formatField("26", merchantAccountInfo),
    formatField("52", "0000"), // Merchant Category Code
    formatField("53", "986"), // Transaction Currency (986 = BRL)
    amount > 0 ? formatField("54", amount.toFixed(2)) : "", // Transaction Amount
    formatField("58", "BR"), // Country Code
    formatField("59", name.substring(0, 25).toUpperCase()), // Merchant Name
    formatField("60", city.substring(0, 15).toUpperCase()), // Merchant City
    additionalData,
    "6304" // CRC16 Header
  ].join("");

  return payload + calculateCRC16(payload);
}

function calculateCRC16(payload: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
    }
  }

  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, "0");
}
