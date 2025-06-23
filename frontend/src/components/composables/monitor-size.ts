import { onMounted, onUnmounted, reactive, Reactive, toRef, toRefs } from "vue";

export function userMonitorSize (){
    const sizes = reactive({
        browserWidth: window.innerWidth,
        deviceWidth: screen.width,
    })

    const browserResized= () => {
        sizes.browserWidth = window.innerWidth
        sizes.deviceWidth = screen.width
    }

    onMounted (() => {
        window.addEventListener('resize', browserResized)
    })
    onUnmounted(()=>{
        window.removeEventListener('resize', browserResized)
    })

    return {
        ...toRefs(sizes)
    }
}