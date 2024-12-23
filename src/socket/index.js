import { NotificationService } from "@services/notification.service";

export const socketController = async (socket) => {
    const notification = new NotificationService();
   /* Get Notification Count*/
    socket.on('getNotification',async function(data) {
    let dataJob = await notification.getPendingNotificationCount(data.userId);
    if(dataJob){
        socket.emit(data.userId, {type:'PENDING_NOTIFICATION_COUNT',data:{count:dataJob}});
    }
   })
   
   /* Read Notification */
   socket.on('readNotification', async function(data) {
   let dataJob = await notification.socketReadNotifications(data.notificationId,data.userId);
   if(dataJob){
    socket.emit(data.userId, {type:'PENDING_NOTIFICATION_COUNT',data:{count:dataJob}});
   }
   })
}