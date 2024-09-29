import { View, Text, ScrollView, TextStyle, StyleSheet, TouchableOpacity } from 'react-native';
import * as React from 'react';
import { Category, Transaction, TransactionsByMonth } from "../types";
import { useSQLiteContext } from 'expo-sqlite/next';
import TransactionsList from '../components/TransactionsList';
import Card from '../components/ui/Card';
import AddTransaction from '../components/AddTransaction';

export default function Home() {
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    const [transactionsByMonth, setTransactionsByMonth] = React.useState<TransactionsByMonth>({
        totalExpenses: 0,
        totalIncome: 0,
    });
    const [currentMonth, setCurrentMonth] = React.useState(new Date(2024, 0)); // Start from January 2024

    const db = useSQLiteContext();

    React.useEffect(() => {
        db.withTransactionAsync(async () => {
            await getData();
        });
    }, [db, currentMonth]);

    async function getData() {
        try {
            // Fetching transactions
            const result = await db.getAllAsync<Transaction>(`SELECT * FROM Transactions ORDER BY date DESC`);
            setTransactions(result);

            // Fetching categories
            const categoriesResult = await db.getAllAsync<Category>(`SELECT * FROM Categories`);
            setCategories(categoriesResult);

            const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
            endOfMonth.setMilliseconds(endOfMonth.getMilliseconds() - 1);

            const startOfMonthTimestamp = Math.floor(startOfMonth.getTime() / 1000);
            const endOfMonthTimestamp = Math.floor(endOfMonth.getTime() / 1000);

            // Fetching transactions by month
            const transactionsByMonth = await db.getAllAsync<TransactionsByMonth>(`
                SELECT
                    COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END), 0) AS totalExpenses,
                    COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END), 0) AS totalIncome
                FROM Transactions
                WHERE date >= ? AND date <= ?;
            `, [startOfMonthTimestamp, endOfMonthTimestamp]);

            setTransactionsByMonth(transactionsByMonth[0] || {});
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    async function deleteTransaction(id: number) {
      db.withTransactionAsync(async () => {
          await db.runAsync(`DELETE FROM Transactions WHERE id = ?`, [id]);
          await getData();
      });
  }

  async function insertTransaction(transaction: Transaction) {
    db.withTransactionAsync(async () => {
      await db.runAsync(
        `
        INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (?, ?, ?, ?, ?);
      `,
        [
          transaction.category_id,
          transaction.amount,
          transaction.date,
          transaction.description,
          transaction.type,
        ]
      );
      await getData();
    });
  }

    function changeMonth(direction: 'previous' | 'next') {
        setCurrentMonth(prevMonth => {
            const newMonth = new Date(prevMonth);
            if (direction === 'previous') {
                newMonth.setMonth(newMonth.getMonth() - 1);
            } else {
                newMonth.setMonth(newMonth.getMonth() + 1);
            }
            return newMonth;
        });
    }

    return (
        <ScrollView contentContainerStyle={{ gap: 15, padding: 15, paddingVertical: 170 }}>
          <AddTransaction insertTransaction={insertTransaction}/>
            <TransactionSummary 
                totalExpenses={transactionsByMonth.totalExpenses} 
                totalIncome={transactionsByMonth.totalIncome}
                changeMonth={changeMonth}
                currentMonth={currentMonth}
            />
            <TransactionsList
                categories={categories}
                transactions={transactions}
                deleteTransaction={deleteTransaction}
            />
        </ScrollView>
    );
}

function TransactionSummary({
  totalIncome, 
  totalExpenses,
  changeMonth,
  currentMonth,
}: TransactionsByMonth & { changeMonth: (direction: 'previous' | 'next') => void, currentMonth: Date }) {

  const savings = totalIncome - totalExpenses;
  const readablePeriod = currentMonth.toLocaleDateString("default", {
      month: "long",
      year: "numeric",
  });

  const getMoneyTextStyle = (value: number): TextStyle => ({
      fontWeight: "bold",
      color: value < 0 ? "#ff4500" : "#2e8b57",
  });

  const formatMoney = (value: number) => {
      const absValue = Math.abs(value).toFixed(2);
      return `${value < 0 ? "-" : ""}$${absValue}`;
  };

  return (    
      <Card style={styles.container}>
          {/* First Line: Buttons */}
          <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={() => changeMonth('previous')} style={styles.button}>
                  <Text style={styles.buttonText}>Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeMonth('next')} style={styles.button}>
                  <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
          </View>

          {/* Second Line: Summary Period */}
          <Text style={styles.periodTitle}>Summary for {readablePeriod}</Text>

          {/* Summary Details: Left Aligned */}
          <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                  Income:{" "}
                  <Text style={getMoneyTextStyle(totalIncome)}>
                      {formatMoney(totalIncome)}
                  </Text>
              </Text>
              <Text style={styles.summaryText}>
                  Total Expenses:{" "}
                  <Text style={getMoneyTextStyle(totalExpenses)}>
                      {formatMoney(totalExpenses)}
                  </Text>
              </Text>
              <Text style={styles.summaryText}>
                  Savings:{" "}
                  <Text style={getMoneyTextStyle(savings)}>{formatMoney(savings)}</Text>
              </Text> 
          </View>
      </Card>       
  );
}

const styles = StyleSheet.create({
  container: {
      marginBottom: 16,
      paddingBottom: 7,
  },
  buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
  },
  button: {
      backgroundColor: '#007BFF', // Button color
      padding: 10,
      borderRadius: 5,
      flex: 1, // Allow buttons to stretch
      marginHorizontal: 5, // Spacing between buttons
  },
  buttonText: {
      color: '#fff',
      fontWeight: 'bold',
      textAlign: 'center', // Center text within button
  },
  periodTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#333",
      textAlign: 'center', // Center the title
      marginBottom: 10, // Space below title
  },
  summaryContainer: {
      alignItems: 'flex-start', // Align text to the left
  },
  summaryText: {
      fontSize: 18,
      color: "#333",
      marginBottom: 10,
  },
});

