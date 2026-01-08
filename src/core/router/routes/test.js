/**
 * 测试路由配置
 * 仅在开发环境使用
 */

export const testRoutes = [
    // Redirect 路由（用于刷新页面）
    {
        path: '/redirect/:path(.*)',
        name: 'redirect',
        component: {
            beforeRouteEnter(to, from, next) {
                next(vm => {
                    vm.$router.replace('/' + to.params.path)
                })
            },
            render() {
                return null
            }
        }
    }
]
