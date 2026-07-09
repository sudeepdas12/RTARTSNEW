import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
  },
  content: {
    flex: 1,
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingTop: 10,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 120,
    fontWeight: "bold",
  },
  value: {
    flex: 1,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 4,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    padding: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    fontSize: 9,
  },
  tableCell: {
    flex: 1,
  },
});

interface PdfDocumentProps {
  content?: ReactNode;
  title?: string;
  subtitle?: string;
  data?: Record<string, unknown>[];
  columns?: { key: string; label: string }[];
  summary?: { label: string; value: string }[];
}

export default function PdfDocument({ content, title = "SEBON RTA/RTS Report", subtitle = "Generated Report", data, columns, summary }: PdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={styles.subtitle}>Generated: {new Date().toLocaleDateString("en-NP")}</Text>
        </View>

        <View style={styles.content}>
          {summary && (
            <View style={{ marginBottom: 15 }}>
              {summary.map((item, idx) => (
                <View style={styles.row} key={idx}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.value}>{item.value}</Text>
                </View>
              ))}
            </View>
          )}

          {data && columns && (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {columns.map((col) => (
                  <Text key={col.key} style={styles.tableCell}>{col.label}</Text>
                ))}
              </View>
              {data.map((row, rowIdx) => (
                <View style={styles.tableRow} key={rowIdx}>
                  {columns.map((col) => (
                    <Text key={col.key} style={styles.tableCell}>{String(row[col.key] ?? "")}</Text>
                  ))}
                </View>
              ))}
            </View>
          )}

          {content}
        </View>

        <View style={styles.footer}>
          <Text>SEBON Registrar & Transfer System · Page 1 of 1</Text>
          <Text>Confidential · For authorized users only</Text>
        </View>
      </Page>
    </Document>
  );
}