package database

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var DB *mongo.Database

func Connect(uri, dbName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(uri)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = client.Ping(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	DB = client.Database(dbName)

	createIndexes(ctx)

	fmt.Println("✅ Connected to MongoDB")
	return nil
}

func createIndexes(ctx context.Context) {
	users := DB.Collection("users")
	_, err := users.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "location", Value: "2dsphere"}},
	})
	if err != nil {
		fmt.Printf("Warning: failed to create 2dsphere index on users.location: %v\n", err)
	} else {
		fmt.Println("✅ Created 2dsphere index on users.location")
	}

	products := DB.Collection("products")
	_, err = products.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "location", Value: "2dsphere"}},
	})
	if err != nil {
		fmt.Printf("Warning: failed to create 2dsphere index on products.location: %v\n", err)
	} else {
		fmt.Println("✅ Created 2dsphere index on products.location")
	}

	_, err = products.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "seller", Value: 1}, {Key: "createdAt", Value: -1}},
	})
	if err != nil {
		fmt.Printf("Warning: failed to create index on products.seller,createdAt: %v\n", err)
	} else {
		fmt.Println("✅ Created index on products.seller,createdAt")
	}
}

func GetDB() *mongo.Database {
	return DB
}
