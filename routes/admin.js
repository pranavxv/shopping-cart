var express = require('express');
var router = express.Router();
// const userHelper = require ('../helpers/user-helpers');
var productHelpers = require('../helpers/product-helpers')

const verifyLogin = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next()
  } else {
    res.redirect('/admin/admin-login')
  }
}

router.get('/', function (req, res, next) {

  if(req.session.adminLoggedIn){
  productHelpers.getAllProducts().then((products) => {

    res.render('admin/View-products', { admin: true, products })
  })
}else{
  res.redirect('admin/admin-login')
}

});
/* GET users listing. */
router.get('/admin-login', (req, res) => {
  let adminLoginErr = req.session.adminLoginErr

  if (req.session.adminLoggedIn) {
    res.redirect('/admin')
  } else {
    res.render('admin/admin-login', { admin: true, adminLoginErr })
    req.session.adminLoggedIn = false
  }
})

router.post('/admin-login', (req, res) => {

  productHelpers.adminDoLogin(req.body).then((response) => {

    if (response.status) {
      req.session.adminLoggedIn = true
      res.redirect('/admin')
    } else {
      
    }
  }).catch((response)=>{
    req.session.adminLoginErr = "Invalid user name or Password"
    res.redirect('/admin/admin-login')
  })
})

router.get('/logout', (req, res) => {
  req.session.admin = null
  req.session.adminLoggedIn = false  
  res.redirect('/admin/admin-login')
})



router.get('/add-product', verifyLogin, (req, res) => {
  res.render('admin/add-product', { admin: true })
})
router.post('/add-product', (req, res) => {

  productHelpers.addProduct(req.body, (id) => {
    let image = req.files.Image
    image.mv('./public/product-images/' + id + '.jpg', (err) => {
      if (!err) {
        res.render('admin/add-product')
      } else {
        console.log(err);
      }
    })

  })
})
router.get('/delete-product/:id', verifyLogin, (req, res) => {
  let proId = req.params.id
  console.log(proId);

  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/')
  })
})
router.get('/edit-product/:id', verifyLogin, async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id)

  res.render('admin/edit-product', { product, admin: true })
})
router.post('/edit-product/:id', verifyLogin, (req, res) => {
  let id = req.params.id

  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin')
    if (req.files?.Image) {
      let image = req.files.Image
      image.mv('./public/product-images/' + id + '.jpg')
    }

  })
})

router.get('/update-order/:id',(req,res)=>{
  let orderId = req.params.id
  productHelpers.getOrderDetails(orderId).then((orderDetails)=>{
    res.render('admin/order-details',{admin:true, orderDetails})
  })
})
router.post('/updateOrderStatus',(req,res)=>{
  productHelpers.updateProductStatus(req.body).then((response)=>{
    res.json(response)
  })
})

router.get('/all-users', verifyLogin, async (req, res) => {
  let allUsers = await productHelpers.getAllUsers()


  res.render('admin/all-users', { allUsers })
})
router.get('/all-orders', verifyLogin, async (req, res) => {
  let orders = await productHelpers.getAllOrders()
  orders.reverse()
  console.log(orders);

  res.render('admin/all-orders', {admin:true, orders })
})

module.exports = router; 
