import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import schema from './schema';
import Product from '../models/Product';
import StockBatch from '../models/StockBatch';
import StockTransaction from '../models/StockTransaction';
import SaleOrder from '../models/SaleOrder';
import SaleItem from '../models/SaleItem';
import Customer from '../models/Customer';

// LokiJS = pure JS, no native linking needed → works in Expo Go for testing
// When ready for production: run `expo prebuild` and swap to SQLiteAdapter
const adapter = new LokiJSAdapter({
    schema,
    useWebWorker: false,    // must be false for React Native
    useIncrementalIndexedDB: false,
    onSetUpError: error => {
        console.error('WatermelonDB setup error:', error);
    },
});

const database = new Database({
    adapter,
    modelClasses: [
        Product,
        StockBatch,
        StockTransaction,
        SaleOrder,
        SaleItem,
        Customer,
    ],
});

export default database;
export { Product, StockBatch, StockTransaction, SaleOrder, SaleItem, Customer };