/**********************************************************************************
*
*	    This file is part of e-venement.
*
*    e-venement is free software; you can redistribute it and/or modify
*    it under the terms of the GNU General Public License as published by
*    the Free Software Foundation; either version 2 of the License.
*
*    e-venement is distributed in the hope that it will be useful,
*    but WITHOUT ANY WARRANTY; without even the implied warranty of
*    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*    GNU General Public License for more details.
*
*    You should have received a copy of the GNU General Public License
*    along with e-venement; if not, write to the Free Software
*    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*
*    Copyright (c) 2017 Romain SANCHEZ <romain.sanchez AT libre-informatique.fr>
*    Copyright (c) 2017 Libre Informatique [http://www.libre-informatique.fr/]
*
***********************************************************************************/
$(document).ready(function() {
	LI.kiosk.init();
});

if ( LI === undefined )
  var LI = {};

LI.kiosk = {
	debug: window.location.hash == '#debug',
	connector: '',//new EveConnector('https://localhost:8164'),
	devices: {},
	templates: {},
	dialogs: {},
	transaction: {},
	products: {},
	urls: {},
	currentPanel: {},
	config: {},
	countries: {},
	ticketsIntegrated: false,
	init: function() {
		LI.kiosk.utils.showLoader();
		LI.kiosk.config = $('#config').data();
		LI.kiosk.urls = $('#kiosk-urls').data();
		LI.kiosk.devices = $('#devices').data('devices');
		LI.kiosk.initPlugins();
		//LI.kiosk.checkDevices();
		LI.kiosk.addListeners();

		//hide current culture from menu
		$('.culture[data-culture="' + LI.kiosk.config.culture + '"]').hide();

		// retrieve data then display menu
		$.when(
			LI.kiosk.getCSRF(),
			LI.kiosk.getTransaction(),
			LI.kiosk.getManifestations(),
			LI.kiosk.getMuseum(),
			LI.kiosk.getStore()
		 )
	     .then(function() {
	  		LI.kiosk.menu();

			//handle idle user
			// if(LI.kiosk.config.idleTime) {
			// 	$(this).idle({
			//   		onIdle: function() {
			//     		$('.culture[data-culture="fr"]')
			//     			.trigger('click')
			//     			// get native element as triggering click
			//     			// doesn't work on jquery objects that  were
			//     			// not previously bound with .click or .on
			//     			.get(0)
			//     			.click()
			//     		;
			//   		},
			//   		idle: LI.kiosk.config.idleTime
			// 	});
			// }

			//Retrieve country list for location prompt
			if(LI.kiosk.config.showLocationPrompt) {
				LI.kiosk.getCountries();
			}
		 })
		;
	},
	reset: function() {
		$(document).off();
		$('body').css('pointer-events', 'none');
		LI.kiosk.utils.hideLoader();
	},
	initPlugins: function() {
		Waves.attach('.waves-effect');
		Waves.init();
		LI.kiosk.cacheTemplates();
		toastr.options = {
			positionClass: 'toast-bottom-full-width',
			closeButton: true,
			timeOut: 0
		};

    	$('.mdl-dialog').each(function(key, elem) {
    		var dialog = $(elem).get(0);

    		dialogPolyfill.registerDialog(dialog);

    		LI.kiosk.dialogs[$(elem).prop('id')] = dialog;
    	});
	},
	addListeners: function() {
		//UI transitions
		$(document)
			.on('menu:mount', function() {
				LI.kiosk.mountProductMenu();
			})
			.on('menu:unmount', function(e) {
				LI.kiosk.menuToList(e.productType);
				$('.culture').hide();
			})
			.on('product-list:mount', function(e) {
				LI.kiosk.mountProductList(e.productType, e.mode);
			})
			.on('product-list:unmount', function(e) {
				if(e.mode == 'back') {
					LI.kiosk.listToMenu();
				}else{
					LI.kiosk.listToProduct(e.product);
				}
			})
			.on('product-details:mount', function(e) {
				LI.kiosk.mountProductDetails(e.product);
			})
			.on('product-details:unmount', function(e) {
				LI.kiosk.productToList(e.productType);
			})
			.on('declinations:mount', function(e) {
				LI.kiosk.mountDeclinations(e.product);
			})
			.on('declinations:unmount', function(e) {
				LI.kiosk.declinationsToPrices(e.product, e.declination);
			})
			.on('prices:mount', function(e) {
				LI.kiosk.mountPrices(e.product, e.declination, e.mode);
			})
			.on('prices:unmount', function(e) {
				if(e.mode == 'direct') {
					LI.kiosk.pricesToProducts(e.product.type, 'back');
				} else {
					LI.kiosk.pricesToDeclinations(e.product);
				}
			})
		;

		//accessibility mode
		$('#access-fab').click(function() {
			$('#access-fab, #app, #back-fab, .panel, #product-details-card').toggleClass('a11y');
		});

		$('#reset-btn').click(function() {
			LI.kiosk.utils.showLoader();
			location.reload();
		});

		//info button
		$('#info-btn').click(function() {
			$('#info-panel').toggle(500);

			setTimeout(function() {
				$('#info-panel').hide(500);
			}, 10000);
		});

		//breadcrumbs clicks
		$('.breadcrumb').not(':last-child').click(function() {
			var id = $(this).prop('id');
			var target = $(this).data('target');

			$('.breadcrumb')
				.not($(this))
				.not('#home-breadcrumb')
				.hide()
			;

			LI.kiosk.utils.switchPanels('right', function() {
				$('#' + target).effect('slide', {
					direction: 'left',
					mode: 'show',
					duration: 500
				});
			});
		});

		//product clicks
		$('#product-list').on('click', '.product', function(event) {
			var productCard = $(event.currentTarget);
			var type = productCard.data('type');
			var id = productCard.data('id');

			$(document).trigger({
				type: 'product-list:unmount',
				mode: 'forth',
				product: LI.kiosk.products[type][id]
			});
		});

		//cart validation clicks
		$('#confirm-btn').click(function() {
			if(LI.kiosk.config.showLocationPrompt) {
				LI.kiosk.utils.showLocationPrompt();
			} else {
				LI.kiosk.checkout();
			}
		});
	},
	checkDevices: function() {
		var ept = false;

		var query = {
            type: LI.kiosk.devices.ept.type,
            params: [{pnpId: LI.kiosk.devices.ept.params.pnpId}]
        };

        if(!LI.kiosk.connector.isConnected()) {
        	LI.kiosk.utils.showHardwarePrompt('connector');
        }

		LI.kiosk.connector.areDevicesAvailable(query).then(
            function(response) {
                if (!response.params.length) {
                	LI.kiosk.utils.showHardwarePrompt('ept');
                }
            },
            function(error) {
            	LI.kiosk.utils.showHardwarePrompt('ept');
            	console.error("areDevicesAvailable() error:", error);
            }
        ).then(function(){
            query = {
            	type: LI.kiosk.devices.ticketPrinter.type,
            	params: [{
            		vid: LI.kiosk.devices.ticketPrinter.params.vid,
					pid: LI.kiosk.devices.ticketPrinter.params.pid
            	}]
            };

            LI.kiosk.connector.areDevicesAvailable(query).then(
                function(response) {
                    if (!response.params.length) {
                    	LI.kiosk.utils.showHardwarePrompt('tickerPrinter');
                    }
                },
                function(error) {
                	LI.kiosk.utils.showHardwarePrompt('ticketPrinter');
                	console.error("areDevicesAvailable() error:", error);
                }
            );
        });
	},
	menu: function() {
		//check if product type menu is needed
     	var lists = {};

		$.each(LI.kiosk.products, function(key, productList) {
			var listLength = Object.keys(productList).length;

			if( listLength > 0)
				lists[key] = listLength;
		});

		if(Object.keys(lists).length > 1) {
			$(document).trigger('menu:mount');
		}else {
			$(document).trigger({
				type: 'product-list:mount',
				productType: Object.keys(lists)[0]
			});
		}

		LI.kiosk.utils.hideLoader();
	},
	getTransaction: function() {
		return $.get(LI.kiosk.urls.getNewTransaction, function(data) {
			LI.kiosk.transaction.id = data;
		});
	},
	getCSRF: function() {
		return $.get(LI.kiosk.urls.getCsrf, function(token) {
			LI.kiosk.CSRF = token;
		});
	},
	getCountries: function() {
		return $.get(LI.kiosk.urls.getCountries + '?culture=' + LI.kiosk.config.culture, function(data) {
			LI.kiosk.countries = JSON.parse(data);
		});
	},
	getManifestations: function() {
		return $.ajax({
		    url: LI.kiosk.urls.getManifestations,
		    type: 'GET',
		    success: LI.kiosk.cacheManifestations,
		    error: LI.kiosk.utils.error
	  	});
	},
	getStore: function() {
		return $.ajax({
		    url: LI.kiosk.urls.getStore,
		    type: 'GET',
		    success: LI.kiosk.cacheStore,
		    error: LI.kiosk.utils.error
	  	});
	},
	getMuseum: function() {
		return $.ajax({
		    url: LI.kiosk.urls.getMuseum,
		    type: 'GET',
		    success: LI.kiosk.cacheMuseum,
		    error: LI.kiosk.utils.error
	  	});
	},
	mountProductMenu: function() {
		LI.kiosk.utils.resetBackFab();

		if( !$('#product-menu-items').children().length > 0 ) {
			var template = Handlebars.compile(LI.kiosk.templates.menuItem);

			$.each(LI.kiosk.products, function(type, length){
				var item = {
					name: $('[data-source="' + type + '"]').data('target'),
					type: type
				};

				$('#product-menu-items').append(template(item));
			});

			$('.menu-item').click(function() {
				$(document).trigger({
					type: 'menu:unmount',
					productType: $(this).data('type')
				});
			});
		}

		$('#product-menu').effect('slide', {
			direction: 'left',
			mode: 'show',
			duration: '300'
		});
	},
	menuToList: function(productType) {
		LI.kiosk.utils.switchPanels('left', function() {
			$(document).trigger({
				type: 'product-list:mount',
				productType: productType,
				mode: 'forth'
			});
		});
	},
	mountProductList: function(type, mode) {
		var direction = mode == 'back' ? 'left': 'right';

		LI.kiosk.utils.resetBackFab();

		$('#back-fab')
			.click(function() {
				$(document).trigger({
					type: 'product-list:unmount',
					mode: 'back'
				});
			})
			.show()
		;

		$('#products-breadcrumb a')
			.html($('[data-source="' + type + '"]').data('target'))
			.parent()
			.css('display', 'inline-block')
		;

		LI.kiosk.insertProducts(type);

		$('#products').effect('slide', {
			direction: direction,
			mode: 'show',
			duration: '300'
		});
	},
	listToProduct: function(product) {
		LI.kiosk.utils.switchPanels('left', function() {
			$(document).trigger({
				type: 'product-details:mount',
				product: product
			});
		});
	},
	listToMenu: function() {
		$('#products-breadcrumb').hide();

		LI.kiosk.utils.switchPanels('right', function() {
			$(document).trigger('menu:mount');
		});
	},
	mountProductDetails: function(product) {
		if(product.type == 'store') {
			LI.kiosk.insertStoreProductDetails(product);
		} else {
			LI.kiosk.insertProductDetails(product);
		}

		$('#details').effect('slide', {
			direction: 'right',
			mode: 'show',
			duration: '300',
			complete: function() {
				$('#details-breadcrumb a')
					.html(product.name)
					.parent()
					.css('display', 'inline-block')
				;
			}
		});
	},
	productToList: function(productType) {
		$('#details-breadcrumb').hide();

		LI.kiosk.utils.switchPanels('right', function() {
			$(document).trigger({
				type: 'product-list:mount',
				mode: 'back',
				productType: productType
			});
		});
	},
	mountDeclinations: function(product) {
		var declinationList = $('#declinations');
		var declinationTemplate = Handlebars.compile(LI.kiosk.templates.declinationCard);

		declinationList.empty();
		$('#prices')
			.empty()
			.hide()
		;

		$.each(product.declinations, function(id, declination) {
			if(product.type == 'store') {
				declination.store = true;
				declination.value = declination.available_prices[Object.keys(declination.available_prices)[0]].value;
			}

			declinationList.append(declinationTemplate(declination));
		});

		$('#back-fab')
			.click(function() {
				$(document).trigger({
					type: 'product-details:unmount',
					productType: product.type
				})
			})
			.show()
		;

		if(product.type !== 'store') {
			$('.declination').off('click').click(function(event) {
				var declination = product.declinations[$(event.currentTarget.children).attr('id')];

				$(document).trigger({
					type: 'declinations:unmount',
					product: product,
					declination: declination
				});

				declinationList.hide();
			});
		}else {
			$('.declination').off('click').click(function(event) {
				var declination = product.declinations[$(event.currentTarget.children).attr('id')];
				var price = declination.available_prices[Object.keys(declination.available_prices)[0]];

				LI.kiosk.cart.addItem(product, price, declination);
			});
		}

		$('#declinations').css('display', 'flex');
	},
	declinationsToPrices: function(product, declination) {
		LI.kiosk.utils.resetBackFab();

		$('#declinations').effect('slide', {
			direction: 'left',
			mode: 'hide',
			duration: '150',
			complete: function() {
				$(document).trigger({
					type: 'prices:mount',
					product: product,
					declination: declination
				});
			}
		});
	},
	mountPrices: function(product, declination, mode) {
		LI.kiosk.insertPrices(product, declination);

		$('#back-fab')
			.click(function() {
				$(document).trigger({
					type: 'prices:unmount',
					mode: mode,
					product: product,
					declination: declination
				})
			})
			.show();
		;

		$('#prices').css('display', 'flex');
	},
	pricesToProducts: function(productType, mode) {
		$('#details-breadcrumb').hide();

		$('#prices').effect('slide', {
			direction: 'right',
			mode: 'hide',
			duration: '300',
			complete: function() {
				$('#details').hide();

				$(document).trigger({
					type: 'product-list:mount',
					productType: productType,
					mode: mode
				});
			}
		});
	},
	pricesToDeclinations: function(product) {
		LI.kiosk.utils.resetBackFab();

		$('#prices').effect('slide', {
			direction: 'right',
			mode: 'hide',
			duration: '300',
			complete: function() {
				$(document).trigger({
					type: 'declinations:mount',
					product: product
				});
			}
		});
	},
	insertProducts: function(type) {
		var cardTemplate = LI.kiosk.templates['productCard'][type];

		if(cardTemplate == null)
			cardTemplate = LI.kiosk.templates['productCard']['manifestations'];

		$('#product-list').empty();

		var template = Handlebars.compile(cardTemplate);

		$.each(LI.kiosk.products[type], function(key, product){
			$('#product-list').append(template(product));
		});
	},
	insertProductDetails: function(product) {
		var detailsTemplate = Handlebars.compile(LI.kiosk.templates.productDetails);

		$('#declinations').empty();
		// insert manif info
		$('#product-details-card').html(detailsTemplate(product));

		if( Object.keys(product.declinations).length > 1 ) {
			$(document).trigger({
				type: 'declinations:mount',
				product: product
			});
		}else {
			$(document).trigger({
				type: 'prices:mount',
				product: product,
				mode: 'direct',
				declination: Object.values(product.declinations)[0]
			});
		}
	},
	insertStoreProductDetails:  function(product) {
	 	var detailsTemplate = Handlebars.compile(LI.kiosk.templates.productDetails);

	 	$('#product-details-card').html(detailsTemplate(product));

 		$(document).trigger({
 			type: 'declinations:mount',
 			product: product
 		});
	},
	insertPrices: function(product, declination) {
		var priceTemplate = $('#price-card-template').html();
		var prices = declination.available_prices;

		$('#prices #declinations')
			.empty()
			.hide()
		;

		var template = Handlebars.compile(priceTemplate);

		for(key in prices){
			$('#prices').append(template(prices[key]));
		}

		LI.kiosk.addPriceListener(product, declination);
	},
	addPriceListener: function(product, declination) {
		$('#prices').off('click').on('click', '.price', function(event) {
			LI.kiosk.cart.addItem(product, product.prices[$(event.currentTarget.children).attr('id')], declination);
		});
	},
	/********************* CACHE **************************/
	rearrangeProperties: function(product) {
		var productDate = new Date(product.happens_at.replace(' ', 'T'));
		var endDate = new Date(product.ends_at);

		product.declinations = {};
		product.prices = {};
		product.start = productDate.toLocaleString().replace(/:\d\d( \w+){0,1}$/,'');
		product.end = endDate.getHours() + ':' + endDate.getMinutes();
		product.name = product.name == null ? product.category : product.name;

		if(product.image_id != undefined)
			product.background = 'background-image: url("' + product.image_url + '"); background-size: cover;';
		else
			product.background = 'background-color: ' + product.color;

		$.each(product.gauges, function(i, gauge){

			var color = '#4FC3F7';

			if ( gauge.color == undefined )
				gauge.color = color;

			$.each(gauge.available_prices, function(key, price){
				if( price.color == undefined || price.color == '0') {
					price.color = color;
				}

				if(LI.kiosk.config.uiLabels.price !== undefined) {
					price.name = price[LI.kiosk.config.uiLabels.price]
				}

				product.prices[price.id] = price;
			});

			product.declinations[gauge.id] = gauge;
		});
	},
	cacheManifestations: function(data) {
		LI.kiosk.products.manifestations = {};
		var type = 'manifestations';

		$.each(data.success.success_fields[type].data.content, function(key, manif) {

			if (LI.kiosk.debug)
				console.log('Loading an item (#' + manif.id + ') from the ' + type);

			manif.type = type;
			LI.kiosk.rearrangeProperties(manif);
			LI.kiosk.products.manifestations[manif.id] = manif;
		});
	},
	cacheMuseum: function(data) {
		var type = 'museum';
		LI.kiosk.products.museum = {};

		$.each(data.success.success_fields[type].data.content, function(key, manif) {

			if (LI.kiosk.debug)
				console.log('Loading an item (#' + manif.id + ') from the ' + type);

			manif.type = type;
			manif.museum = true;
			LI.kiosk.rearrangeProperties(manif);
			LI.kiosk.products.museum[manif.id] = manif;
		});
	},
	cacheStore: function(data) {
		var type = 'store';
		LI.kiosk.products.store = {};

		$.each(data.success.success_fields[type].data.content, function(key, product) {

			if (LI.kiosk.debug)
				console.log('Loading an item (#' + product.id + ') from the ' + type);

			product.prices = {};
			product.type = type;
			product.store = true;

			$.each(product.declinations, function(i, declination) {

				var color = '#4FC3F7';

				if ( declination.color == undefined || declination.color == '0')
					declination.color = color;

				$.each(declination.available_prices, function(key, price) {
					if( price.color == undefined || price.color == '0') {
						price.color = color;
					}

					if(LI.kiosk.config.uiLabels.price !== undefined) {
						price.name = price[LI.kiosk.config.uiLabels.price]
					}

					product.prices[price.id] = price;
				});

				product.declinations[declination.id] = declination;
			});

			LI.kiosk.products.store[product.id] = product;
		});
	},
	cacheTemplates: function() {
		//make handlebars cache the templates for quicker future uses
		$('script[type="text/x-handlebars-template"]').each(function(id, template) {
			var templateType = $(template).data('template-type');
			var productType = $(template).data('product-type');
			var html = $(template).html();

			if( LI.kiosk.templates[templateType] === undefined )
				LI.kiosk.templates[templateType] = {};

			if(productType !== undefined)
				LI.kiosk.templates[templateType][productType] = html;
			else
				LI.kiosk.templates[templateType] = html;
		});
	},
	/******************** CART ****************************/
	cart: {
		total: 0,
		lines: {},
		insertLine: function(line, item, price, declination) {
			var lineTemplate = Handlebars.compile(LI.kiosk.templates.cartLine);

			$('#cart-lines').append(lineTemplate(line));

			$('#' + line.id + ' .remove-item').click(function(){
				LI.kiosk.cart.removeItem(line.id, item);
			});

			$('#' + line.id + ' .add-item').click(function(){
				LI.kiosk.cart.addItem(item, price, declination);
			});
		},
		removeLine: function(htmlLine) {
			$(htmlLine).hide(500).remove();
		},
		lineTotal: function(line) {
			line.total = LI.format_currency(line.price.raw_value * line.qty, false);
		},
		cartTotal: function() {
			LI.kiosk.cart.total = 0;

			$.each(LI.kiosk.cart.lines, function(key, line) {
				LI.kiosk.cart.total += line.price.raw_value * line.qty;
			});

			$('#cart-total-value').text(LI.format_currency(LI.kiosk.cart.total, false));
		},
		addItem: function(item, price, declination) {
			var newLine;
			var lineId;
			var lineExists = false;

			$.each(LI.kiosk.cart.lines, function(key, line) {
				if(line.product.id == item.id && line.price.id == price.id && line.declination.id == declination.id){
					var htmlLine = $('#' + line.id);

					line.qty++;
					exists = true;
					LI.kiosk.cart.lineTotal(line);

					htmlLine.find('.line-total').text(line.total);
					htmlLine.find('.line-qty').text(line.qty);
					LI.kiosk.utils.flash('#' + line.id);

					newLine = line;
				}
			});

			if(!lineExists) {
				newLine = LI.kiosk.cart.newLine(item, price, declination);
				LI.kiosk.utils.flash('#' + newLine.id);
			}

			LI.kiosk.cart.cartTotal();

			if(!$('#cart').is(':visible')) {
				$('#cart').show(500);
				$('#cart').css('display', 'flex');
		    }

		    LI.kiosk.cart.validateItem(newLine);
		},
		removeItem: function(lineId, item) {
			var line = LI.kiosk.cart.lines[lineId];
			var htmlLine = $('#' + lineId);

			line.qty--;
			LI.kiosk.cart.lineTotal(line);

			if(line.qty == 0){
				delete LI.kiosk.cart.lines[lineId]
				LI.kiosk.cart.removeLine(htmlLine);
			}else{
				LI.kiosk.cart.lines[lineId] = line;
				htmlLine.find('.line-qty').text(line.qty);
				htmlLine.find('.line-total').text(line.total);
			}

			LI.kiosk.cart.updateTransaction({
		    	transaction: {
		    		price_new: {
		    			_csrf_token: LI.kiosk.CSRF,
		    			price_id: line.price.id,
		    			declination_id: line.declination.id,
		    			type: item.type == 'store' ? 'declination' : 'gauge',
		    			bunch: item.type,
		    			id: LI.kiosk.transaction.id,
		    			state: '',
		    			qty: '-1'
		    		}
		        }
		    });

			LI.kiosk.cart.cartTotal();

			if(Object.keys(LI.kiosk.cart.lines) < 1)
				$('#cart').hide(200);
		},
		newLine: function(item, price, declination) {
			var newLine = {
				id: LI.kiosk.utils.generateUUID(),
				name: item.name,
				product: item,
				value: price.value,
				price: price,
				declination: declination,
				qty: 1,
				total: price.value
			};

			LI.kiosk.cart.lines[newLine.id] = newLine;
			LI.kiosk.cart.insertLine(LI.kiosk.cart.lines[newLine.id], item, price, declination);

			return newLine;
		},
		validateItem: function(line) {
			var available = false;

		    if(line.product.type == 'store') {
		    	available = true;
		    }

			if(line.product.gauge_url !== undefined ) {
				available = LI.kiosk.cart.checkAvailability(line.product.gauge_url, line.id, line.product.id);
			}

			if(available) {
		    	LI.kiosk.cart.updateTransaction({
			    	transaction: {
			    		price_new: {
			    			_csrf_token: LI.kiosk.CSRF,
			    			price_id: line.price.id,
			    			declination_id: line.declination.id,
			    			type: line.product.type == 'store' ? 'declination' : 'gauge',
			    			bunch: line.product.type,
			    			id: LI.kiosk.transaction.id,
			    			state: '',
			    			qty: '1'
			    		}
			        }
			    });
			}
		},
		// checkAvailability: function(gaugeUrl, lineId, productId) {
		// 	var qty = 0;
		// 	var available = true;

		// 	$.each(LI.kiosk.cart.lines, function(key, line) {
		// 		if(line.product.id == productId)
		// 			qty += line.qty;
		// 	});

		// 	$.get(gaugeUrl, function(data) {

		// 		if(data.free < qty){
		// 			available = false;
		// 			$('#' + lineId + ' .remove-item').click();
		// 			toastr.info('The last item added to the cart was removed as it wasn\'t available anymore');
		// 		}
		// 	});

		// 	return available;
		// },
		updateTransaction: function(data, successCallback, errorCallback) {
			return $.ajax({
			    url: LI.kiosk.urls.completeTransaction.replace('-666', LI.kiosk.transaction.id),
			    type: 'get',
			    data: data,
			    success: successCallback,
			    error: errorCallback !== undefined ? errorCallback : LI.kiosk.utils.error
			});
		}
	},
	/************** CHECKOUT *******************************/
	checkout: function() {
		LI.kiosk.utils.showPaymentPrompt();

		var eptOptions = {
		    amount: LI.kiosk.cart.total * 100,
		    delay: 'A010',
		    version: 'E+'
		};

		var message = new ConcertProtocolMessage(eptOptions);

		var device = new ConcertProtocolDevice(LI.kiosk.devices.ept, LI.kiosk.connector);

		device
			.doTransaction(message)
			.then(function(res) {
	        	if(res.stat === '0') {
	      		LI.kiosk.finalize();
	        	} else {
	        		console.error(res.stat + ' ' + res.getStatusText());
	        		LI.kiosk.utils.showPaymentFailurePrompt();
	        	}
	    	})
	    	.catch(function(err) {
	        	console.error(err);
	    	})
	    ;
	},
	finalize: function() {
		LI.kiosk.print();

		LI.kiosk.cart.updateTransaction({
			transaction: {
				payment_new: {
					_csrf_token: LI.kiosk.CSRF,
					value: LI.kiosk.cart.total,
					payment_method_id: LI.kiosk.config.paymentMethod
				}
			}
		});
	},
	print: function(duplicate) {
		LI.kiosk.utils.showPaymentSuccessPrompt();

		if(!LI.kiosk.ticketsIntegrated) {
			LI.kiosk.integrateTickets().then(function() {
				LI.kiosk.printTickets(duplicate);
			});

			return;
		}

		LI.kiosk.printTickets(duplicate);
	},
	/******************  TICKETS **************************/
	integrateTickets: function() {
		return LI.kiosk.cart.updateTransaction(
			{
	    		transaction: {
	    			store_integrate: {
	    				_csrf_token: LI.kiosk.CSRF,
	    				id: LI.kiosk.transaction.id,
	    				force: ''
	    			}
	        	}
		    },
		    function() {
		    	LI.kiosk.ticketsIntegrated = true;
		    }
		);
	},
	printTickets: function(duplicate) {
	 	$.get(
			LI.kiosk.urls.printTickets.replace('-666', LI.kiosk.transaction.id) +
				'?duplicate="' + duplicate + '"' +
				'&price_name=&manifestation_id=' +
				'&direct={"vid": ' + LI.kiosk.devices.ticketPrinter.params.vid +
				', "pid": ' + LI.kiosk.devices.ticketPrinter.params.pid +
				'}'
			,
			function(data) {

	            var ticketPrinter = new StarPrinter(LI.kiosk.devices.ticketPrinter, LI.kiosk.connector);

	           	ticketPrinter.pollPrint(data).then(
	           		function(result) {
	            		console.log('printResult: ' + result);

	            		LI.kiosk.close();
	            	},
	            	function(error) {
	            		console.error('printResult: ' + error);

	            		LI.kiosk.handlePrintFailure(error, ticketPrinter);
	            	}
	         	);
        	}
        );
	},
	handlePrintFailure: function(error, printer) {
		LI.kiosk.connector.resetData(LI.kiosk.devices.ticketPrinter);
		LI.kiosk.utils.showTicketFailurePrompt(error, printer);
	},
	logPrintFailure: function(error, printer) {
		var data = {
			printer: printer.vendor + ' ' + printer.model,
			status: error.statuses.join(' | '),
			raw_status: error.raw_status,
			duplicate: error.duplicate,
			error: true
		};

		$.ajax({
			type: 'GET',
			url: LI.kiosk.urls.logPrintFailure.replace('-666', LI.kiosk.transaction.id),
			data: { directPrint: data },
			dataType: 'json',
			success: function(response) {
				if (LI.kiosk.debug) {
					console.log(response);
				}
			},
			error: LI.kiosk.utils.error
		});
	},
	printReceipt: function() {

	},
	close: function() {
		LI.kiosk.utils.showFinalPrompt();
		LI.kiosk.printReceipt();
		LI.kiosk.cart.updateTransaction({
			transaction: {
				close: {
					_csrf_token: LI.kiosk.CSRF,
					id: LI.kiosk.transaction.id
				}
			}
		});
	},
	/********************* UTILS *************************/
	utils: {
		generateUUID: function() {
		    var d = new Date().getTime();
		    //Force letter as first character to avoid selector issues
		    var uuid = 'Axxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		        var r = (d + Math.random() * 16) % 16 | 0;
		        d = Math.floor(d / 16);
		        return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
		    });

		    return uuid.toUpperCase();
		},
		error: function(error) {
			console.error(error);
		},
		showLoader: function() {
			$('#spinner')
			    .addClass('is-active')
			    .css('display', 'block')
			;
		},
		hideLoader: function() {
			$('#spinner')
			    .removeClass('is-active')
			    .css('display', 'none')
			;
		},
		flash: function(selector) {
			Waves.attach(selector);
			Waves.init();
			Waves.ripple(selector);
		},
		resetBackFab: function() {
			$('#back-fab').off('click').hide();
		},
		switchPanels: function(direction, callback) {
			LI.kiosk.utils.resetBackFab();

			$('.panel:visible').effect('slide', {
				'direction': direction,
				mode: 'hide',
				duration: 500,
				complete: callback
			});
		},
		showLocationPrompt: function() {
    		LI.kiosk.dialogs.location.showModal();
			LI.kiosk.utils.setupCountryField();
    		LI.kiosk.utils.setupKeyPad();
    		LI.kiosk.utils.addLocationDialogListeners();
		},
		setupKeyPad: function() {
			$('#keypad').keypad({
        		inputField: $('#postcode'),
        		deleteButtonText: '<i class="material-icons">keyboard_backspace</i>',
        		deleteButtonClass: 'mdl-cell--8-col',
        		buttonTemplate: '<button class="key mdl-button mdl-js-button mdl-button--raised waves-effect mdl-cell--4-col"></button>'
    		});
		},
		addLocationDialogListeners: function(dialog) {
			$(LI.kiosk.dialogs.location).on('close', function() {
    			LI.kiosk.cart.updateTransaction({
			    	transaction: {
			    		_csrf_token: LI.kiosk.CSRF,
			    		postalcode: $('#postcode').val(),
			    		country: $('#countries').val()
			        }
				});

				LI.kiosk.checkout();
    		});

    		$('#countries').change(function() {
    			$('#postcode').prop('disabled', true);
    		});

    		$('#postcode').change(function() {
    			$('#countries').val('FR');
    		});
		},
		setupCountryField: function() {
			if(LI.kiosk.countries.length == 0) {
				LI.kiosk.getCountries();
			}

			$.each(LI.kiosk.countries, function(key, country) {
    			if(undefined !== country.Translation[LI.kiosk.config.culture]) {
	    			$('<option>')
	    				.addClass('country')
	    				.prop('id', country.codeiso2.toLowerCase())
	    				.val(country.codeiso2)
	    				.html(country.Translation[LI.kiosk.config.culture].name)
	    				.appendTo('#countries')
	    			;
    			}
    		});

    		$('#' + LI.kiosk.config.culture).prop('selected', true);
		},
		showPaymentPrompt: function() {
			LI.kiosk.utils.resetStatusDialog();

			$('#status-title').html('Please follow payment terminal instructions');
			$('#status-ept').show();

			LI.kiosk.utils.showStatusDialog();
		},
		showPaymentFailurePrompt: function() {
			LI.kiosk.utils.resetStatusDialog();

			$('#status-title').text('Payment failed');
			$('#status-actions').show();

			$(LI.kiosk.dialogs.status).on('close', function() {
    			if(LI.kiosk.dialogs.status.returnValue == 'true') {
    				LI.kiosk.checkout();
    			} else {
    				LI.kiosk.close();
    			}
    		});

			LI.kiosk.utils.showStatusDialog();
		},
		showPaymentSuccessPrompt: function() {
			LI.kiosk.utils.resetStatusDialog();

			$('#status-title').text('Payment successful');
			$('#status-details').text('Please wait while your tickets are being printed');

			LI.kiosk.utils.showStatusDialog();

			$('#spinner')
				.css({
					position: 'initial',
					margin: 'auto'
				})
				.appendTo($('#status-content'));

			LI.kiosk.utils.showLoader();
		},
		showFinalPrompt: function() {
			LI.kiosk.utils.resetStatusDialog();

			$('#status-title').text('Thank you, come again');

			LI.kiosk.utils.showStatusDialog();
		},
		showHardwarePrompt: function(device) {
			LI.kiosk.utils.resetStatusDialog();

			$('#status-title').text('OUT OF ORDER');
			$('#status-details').text(device + ' Error');
			$('#status-actions').hide();

			LI.kiosk.utils.showStatusDialog();

			LI.kiosk.reset();
		},
		showTicketFailurePrompt: function(error, printer) {
			LI.kiosk.utils.resetStatusDialog();

			error.duplicate = true;

			$('#status-title').text('Ticket printing failed');
			$('#status-actions').show();

			$(LI.kiosk.dialogs.status).on('close', function() {
    			if(LI.kiosk.dialogs.status.returnValue == 'true') {
    				LI.kiosk.print(true);
    			} else {
    				LI.kiosk.close();
    			}
    		});

			LI.kiosk.logPrintFailure(error, printer);

			LI.kiosk.utils.showStatusDialog();
		},
		showStatusDialog: function() {
			if(!LI.kiosk.dialogs.status.open) {
				LI.kiosk.dialogs.status.showModal();
			}
		},
		resetStatusDialog: function() {
			LI.kiosk.utils.hideLoader();
			$('#status-actions, #status-ept').hide();
			$('#status-details, #status-title').text('');

			$(LI.kiosk.dialogs.status).off('close');

			if(LI.kiosk.dialogs.status.open) {
				LI.kiosk.dialogs.status.close();
			}
		}
	}
}
