/*
    This file is used for separation of concerns between user/story specific implementations and more generic mongoDB interactions
    It knows nothing about user, it just provides a base class. 
    
    Both the Users collection and the Stories collection can use this base class, and any future collections we might add.

    */

import { MongoClient } from 'mongodb';

export default class MongoBaseRepository {
  constructor({ mongoUrl, dbName, collectionName }) {
    this.client = new MongoClient(mongoUrl);
    this.dbName = dbName;
    this.collectionName = collectionName;
    this._collection = null;
    this._db = null;
  }

  async getDb() {
    if (!this._db) {
      await this.client.connect();
      this._db = this.client.db(this.dbName);
    }
    return this._db;
  }

  async getCollection() {
    if (!this._collection) {
      this._collection = (await this.getDb()).collection(this.collectionName);
    }
    return this._collection;
  }
}