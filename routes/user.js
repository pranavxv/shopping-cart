var express = require('express');
var router = express.Router();
var productHelpers = require ('../helpers/product-helpers')
const userHelper = require ('../helpers/user-helpers');
const userHelpers = require('../helpers/user-helpers');
var db = require('../config/connection');
const collection = require('../config/collection');
const objectId = require('mongodb').ObjectId

const verifyLogin = (req,res,next)=>{
  if(req.session.userLoggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/',async function(req, res, next) {
  let user = req.session.user
  console.log(user);
  
  let cartCount=null
  
  if(req.session.user){
  cartCount=await userHelpers.getCartCount(req.session.user._id,req.params.id)
  req.session.user=await userHelpers.getUser(req.session.user._id)
  user =req.session.user
  
  } 
  productHelpers.getAllProducts().then((products)=>{
    
    res.render('user/View-products',{products,user,cartCount})
  })
}); 

router.get('/login',(req,res)=>{  
  if(req.session.user){
    res.redirect('/')
  }else{
    res.render('user/login',{"loginErr":req.session.userLoginErr})
    req.session.userLoginErr = false  
  }
  
})   
router.get('/signup',(req,res)=>{
 
  res.render('user/signup',{"signErr":req.session.userSignErr})
  req.session.userSignErr = false
  
})   
router.post('/signup',(req,res)=>{
  userHelper.doSignup(req.body).then((response)=>{
    if(response.status){
      
      req.session.user = response.user
      req.session.userLoggedIn = true
      res.redirect('/')

    }else{
      
      req.session.userSignErr = 'You already signup with this Email id!'
      res.redirect('/signup')
      
  }
  })
})
router.post('/login',(req,res)=>{
  userHelper.doLogin(req.body).then((response)=>{
    if(response.status){
      
      req.session.user = response.user
      req.session.userLoggedIn = true
      res.redirect('/')
    }else{
      req.session.userLoginErr = 'Invalid username or password'
      res.redirect('/login')
    }
  })
})
router.get('/logout',(req,res)=>{
  req.session.user=null
  req.session.userLoggedIn=false
  res.redirect('/')
})
router.get('/cart',verifyLogin,async(req,res)=>{
  let products =await userHelpers.getCartProducts(req.session.user._id)
  let totalValue=0
  let cartCount = await userHelpers.getCartCount(req.session.user._id)
  if(products.length>0){
    totalValue=await userHelper.getTotalAmount(req.session.user._id)
  }
  res.render('user/cart',{products,user:req.session.user,totalValue,cartCount})
})
router.get('/add-to-cart/:id',(req,res)=>{
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
  
    res.json({status:true})
  })
})
router.post('/change-product-quantity',(req,res,next)=>{

  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
    console.log('Quantitiy Changed');
    response.total= await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})

router.get('/place-order',verifyLogin,async(req,res)=>{
let user = req.session.user
let cartCount = null

if(user){
  cartCount = await userHelpers.getCartCount(req.session.user._id)
}
  let total= await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total,user,cartCount})
})
router.post('/place-order',async(req,res)=>{
  
  let products=await userHelpers.getCartProductList(req.body.userId)
  let totalPrice=await userHelpers.getTotalAmount(req.body.userId)
  
  userHelper.placeOrder(req.body,products,totalPrice).then((orderId)=>{
    if(req.body['payment-method']==='COD'){
      req.session.user.orderId = orderId;
      db.get().collection(collection.CART_COLLECTION).deleteOne({user: new objectId (req.session.user._id)})
      res.json({codSuccess:true})

    }else if(req.body['payment-method']==='ONLINE'){ 

      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
        
        res.json(response)
      }) 
    }else{
      res.json({status:false})
    }
  }) 
})

router.get('/confirm-order',verifyLogin, (req, res)=>{
 
  if(req.session.user.orderId == null){
    console.log('No orders');
    res.redirect('/orders')
  }else{
    userHelpers.getSingleOrder(req.session.user.orderId).then(async (order)=>{
      let products =await userHelpers.getOrderProducts(req.session.user.orderId)

        res.render('user/confirm-order',{user:req.session.user, order, products})
        db.get().collection(collection.CART_COLLECTION).deleteOne({user:new objectId(req.session.user._id)})//removeing cart
        req.session.user.orderId = null;
      })     
  }
})

router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})
router.get('/orders',verifyLogin,async(req,res)=>{
  if(req.session.userLoggedIn){
    let orders=await userHelpers.getUserOrders(req.session.user._id)  
    orders.reverse()
    let cartCount = null;
    if(req.session.user){
      cartCount = await userHelpers.getCartCount(req.session.user._id) 
    }
    res.render('user/orders',{user:req.session.user,orders,cartCount})
  }
  else{
    res.redirect('/login')
  }
})
router.get('/view-order-products/:id',async(req,res)=>{
  let products=await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session.user,products})
})
router.post('/verify-payment',(req,res)=>{

  userHelpers.verifyPayment(req.body).then((response)=>{

    if(response){
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      req.session.user.orderId = req.body['order[receipt]']
      
      res.json({status:true}) 
    })
    }else{
      res.redirect('/')
    }
  }).catch((err)=>{
    console.log(err);
    res.json({status:false,errMsg:''})
  })
})
router.post('/remove-product',(req,res)=>{
  
  userHelpers.removeProduct(req.body).then((response)=>{
    res.json(response)
    
  })  
})

router.post('/cancelProduct',(req,res)=>{
  userHelpers.cancelProduct(req.body).then((response)=>{
    res.json(response)
  })
})

router.get('/order-product',(req,res)=>{
  res.render('user/view-order-products',{user:req.session.user})
})
router.get('/user-details',verifyLogin,(req,res)=>{
  
  res.render('user/user-details',{user:req.session.user})
})
router.post('/user-details/:id',(req,res)=>{

  userHelpers.userNameUpdate(req.session.user._id,req.body).then((response)=>{ 
    if(response){
      
    res.redirect('/')   
    
    }
  }) 
})


module.exports = router;
