var db = require('../config/connection')
var collection = require('../config/collection')
const bcrypt = require('bcrypt')
const { response } = require('express')
const objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay')
const { resolve } = require('path')
const { rejects } = require('assert')
const { promise } = require('bcrypt/promises')

var instance = new Razorpay({
    key_id: 'rzp_test_9iDceggQLKc4tN',
    key_secret: 'u1gzEXbpsMeWO457AmK2qgOr',
});

module.exports = {
    doSignup: (newUserData) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: newUserData.Email })
            if (user) {
                resolve({ status: false })
                console.log('login sign failed');
            } else {
                newUserData.Password = await bcrypt.hash(newUserData.Password,10)
                db.get().collection(collection.USER_COLLECTION).insertOne(newUserData)
                let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: newUserData.Email })
                    response.user = user
                    response.status = true
                    console.log('login true');
                    resolve(response)
                
            }
        })

    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('login failed');
                        resolve({ status: false })
                    }
                })
            } else {
                console.log('login Failed');
                resolve({ status: false })
            }
        })
    },
    addToCart: (proId, userId) => {
        return new Promise(async (resolve, reject) => {
            let proObj = {
                item: new objectId(proId),
                quantity: 1
            }
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)

                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: new objectId(userId), 'products.item': new objectId(proId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            }
                        ).then(() => {
                            resolve()
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: new objectId(userId) },
                            {
                                $push: { products: proObj }
                            }
                        ).then((response) => {
                            resolve()
                        })
                }
            } else {
                let cartObj = {
                    user: new objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    }, getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: new objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: "product"
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
            // console.log(cartItems[0].products);
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (reslove, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new objectId(userId) })

            if (cart) {
                count = cart.products.length
            }
            reslove(count)
        })
    },


    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)

        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                console.log('Count Is Zero');
                
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: new objectId(details.cart) },
                    {
                        $pull: { products: { item: new objectId(details.product) } }
                    }).then((response) => {
                        resolve({ removeProduct: true })
                    })
                //resolve({removeProduct:true,proId:details.proId})
            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: new objectId(details.cart), 'products.item': new objectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': details.count }
                        }
                    ).then((response) => {
                        resolve({ removeProduct: false , proId : details.proId })
                    })
            }
        })
    },

    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: new objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: "product"
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: [{ $toInt: "$quantity" }, { $toInt: "$product.Price" }] } }
                    }
                }

            ]).toArray()
            if (total[0]) {
                resolve(total[0].total)
            } else {
                resolve([]);
            }
        })
    },
    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            let status = order['payment-method'] === "COD" ? 'placed' : 'Not Placed'
            let orderObj = {
                deliveryDetails: {
                    name: order.name,
                    mobile: order.mobile,
                    state: order.state,
                    city : order.city,
                    address: order.address,
                    road : order.road,
                    pincode: order.pincode
                },
                userId: new objectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                status: status, 
                date: new Date()
            }
            if (products) {
                db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {

                    //db.get().collection(collection.CART_COLLECTION).deleteOne({ user: new objectId(order.userId) })

                    resolve(response.insertedId)
                })
            }else{
                
            }
        })
    },
  
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new objectId(userId) })
            if (cart) {
                resolve(cart.products)
            } else {
                resolve()
            }
        })
    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ userId: new objectId(userId) }).toArray()
            resolve(orders)

        })
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: new objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(orderItems)
        })
    },
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: total * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err);
                } else {
                    resolve(order)
                }

            });
        })
    },
    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'u1gzEXbpsMeWO457AmK2qgOr')

            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({ _id: new objectId(orderId) },
                    {
                        $set: {
                            status: 'placed'
                        }
                    }
                ).then(() => {
                    resolve()
                })
        })
    },
    getSingleOrder:(orderId)=>{
        console.log(orderId);
        return new Promise(async(resolve, reject) => {
            let order =  await db.get().collection(collection.ORDER_COLLECTION)
            .findOne({_id:new objectId(orderId)})
            console.log('order from orders')
            console.log(order)
            resolve(order)
        })
        
    },
    getOrderProducts:(productId)=>{
        return new Promise(async(resolve, reject)=>{
            let orderItem = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:new objectId(productId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1, quantity:1,product:{ $arrayElemAt: ['$product',0]}
                    }
                }
                
                
            ]).toArray()
            console.log(orderItem);
            resolve(orderItem)
        })
    },

    removeProduct: (remove) => {
        return new Promise((resolve, reject) => {
            console.log(remove);
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({ _id: new objectId(remove.cart) },
                {
                    $pull: { products: { item: new objectId(remove.product) } }
                },false,
                true).then(() => {
                    resolve({ removeProduct: true })
                })
        })
    },

    cancelProduct :(clear)=>{
        console.log(clear);
      return new promise((resolve,reject) =>{
        db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({ _id: new objectId(clear.order) },
                {
                    $pull: { products: { item: new objectId(remove.product) } }
                },false,
                true).then(() => {
                    resolve({ removeProduct: true })
                })
      })  
    },
    getUser:(userId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION).findOne({_id:new objectId(userId)}).then((response)=>{
                resolve(response)
            })
        })
    },
    userNameUpdate: (userId, userNewData) => {
        return new Promise((resolve, reject) => {

            db.get().collection(collection.USER_COLLECTION)
                .updateOne({ _id: new objectId(userId) }, {
                    $set: {
                        Name: userNewData.Name
                    }
                }).then((response) => {
                    resolve(response)
                })
        })

    },
    


}