var db = require ('../config/connection')
var collection = require ('../config/collection');
const { response } = require('express');
const objectId = require('mongodb').ObjectId
const bcrypt = require ('bcrypt')

module.exports={
    addProduct:(product,callback)=>{
        console.log(product);

        db.get().collection('product').insertOne(product).then((data)=>{
           
            callback(data.insertedId)
        })
    },
    getAllProducts:()=>{
        return new Promise (async(resolve,reject)=>{
            let product =await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(product)
        })
    },
    deleteProduct:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:new objectId(proId)}).then((response)=>{
                console.log(response);
                resolve(response)
            })
        })
    },
    getProductDetails:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:new objectId(proId)}).then((product)=>{
                resolve(product)
            })
        })
    },
    updateProduct:(proId,proDetails)=>{
        return new Promise ((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION)
            .updateOne({_id:new objectId(proId)},{
                $set:{
                    Name : proDetails. Name,
                    Description : proDetails. Description,
                    Price : proDetails. Price,
                    Category : proDetails. Category
                }
            }).then((response)=>{
                resolve()
            })
        })
    },
    adminDoLogin:(userData)=>{
        return new Promise(async(resolve, reject)=>{
            if(userData.Email == "admin@admin.com" && userData.Password == '321'){
                resolve({status:true})
            }else{
                reject({status:false})
            }
        })
    },
    getAllUsers:()=>{
        return new Promise (async(resolve,reject)=>{
            let users=await db.get().collection(collection.USER_COLLECTION)
            .find().toArray()
            resolve(users)
          
        })
    },
    
    getAllOrders: () => {
        return new Promise(async (resolve, reject) => {
            let allOrderItems = await db.get().collection(collection.ORDER_COLLECTION)
            .find().toArray()
            console.log(allOrderItems);
            resolve(allOrderItems)
        })
    },

    getOrderDetails:(orderId)=>{
        return new Promise (async(resolve,reject)=>{
            let orderDetails = await db.get().collection(collection.ORDER_COLLECTION)
            .findOne({_id: new objectId (orderId)})

            resolve(orderDetails)
        })
    },
    updateProductStatus:(details)=>{
        return new Promise ((resolve , reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id : new objectId (details.orderId)},{
                $set:{
                    status:details.newStatus
                }
            }).then(()=>{
                resolve({status:true})
            })
        })
    }
}  