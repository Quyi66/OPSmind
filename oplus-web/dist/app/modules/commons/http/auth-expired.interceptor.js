/*! oplus-modules v1.0.0 */
(function () {
  "use strict"

  function authExpiredInterceptor($rootScope, $q, $injector, $localStorage, $sessionStorage, currentUser) {
    return {
      responseError: function (response) {
        var status = response && response.status

        if (status === 401 || status === 402) {
          try {
            if (currentUser && typeof currentUser.clearUserInfo === 'function') {
              currentUser.clearUserInfo()
            }
          } catch (error) {}

          if (typeof window !== 'undefined' && window.self !== window.top) {
            try {
              window.parent.postMessage(
                {
                  source: 'oplus-angular',
                  type: 'ANGULAR_AUTH_EXPIRED',
                  payload: {
                    status: status,
                    url: response && response.config ? response.config.url : undefined
                  }
                },
                '*'
              )
            } catch (postMessageError) {}
          }
        }

        return $q.reject(response)
      }
    }
  }

  angular.module('oplus.commons').factory('authExpiredInterceptor', authExpiredInterceptor)
  authExpiredInterceptor.$inject = ['$rootScope', '$q', '$injector', '$localStorage', '$sessionStorage', 'currentUser']
}())
