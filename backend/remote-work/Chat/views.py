from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
# from channels.layers import async_to_sync
from asgiref.sync import async_to_sync
from django.contrib import messages
from django.http import HttpResponse
from django.http import Http404
from .models import *
# from .forms import *

@login_required
def chat_view(request, chatroom_name='public-chat'):
    chat_group=get_object_or_404(ChatGroup, group_name=chatroom_name)
    chat_messages=chat_group.chat_messages.all()[:30]
    form=ChatmessageCreatForm()
    
    other_user=None
    if chat_group.is_private:
        if request.user not in chat_group.members.all():
            raise Http404()
        for member in chat_group.members.all():
            if member!=request.user:
                other_user=member
                break
            
    if chat_group.groupchat_name:
        if request.user not in chat_group.members.all():
            if request.user.emailadress_set.filter(verified=True).exists():
                chat_group.members.add(request.user)
            else:
                messages.warning(request, 'You need to verify your email to join the chat!')
                return redirect('profile-settings')
    
    if request.htmx:
        form=ChatmessageCreateForm(request.POST)
        if form.is_valid:
            message=form.save(commit=False)
            message.author=request.user
            message.group=chat_group
            message.save()
            context={
                'message':message,
                'user':request.user
            }
            return render(request, 'remote-work/chat/partials/chat_message_p.html', context)
        
    context={
        'chat_message':chat_message,
        'form':form,
        'other_user':other_user,
        'chatroom_name':chatroom_name,
        'chat_group':chat_group
    }
    
    return render(request,'chat/chat.html',context)

@login_required
def get_or_create_chatroom(request,username):
    if request.user.username==username:
        messages.warning(request,"You cannot start a chat with yourself.")
        return redirect('home')
    
    try:
        other_user=User.objects.get(username=username)
    except User.DoesNotExist:
        messages.error(request,f"User '{username}' does not exist.")
        return redirect('home')
    
    my_chatrooms=request.user.chat_groups.filter(is_private=True)
    existing_room=None
    
    for chatroom in my_chatrooms:
        if other_user in chatroom.members.all():
            existing_room=chatroom
            break
    if not existing_room:
        existing_room=ChatGroup.objects.create(is_private=True)
        existing_room.members.add(other_user,request.user)
        
    return redirect('chatroom', existing_room.group_name)

@login_required
def create_groupchat(request):
    form=NewGroupForm()
    
    if request.method=='POST':
        form=NewGroupForm(request.POST)
        if form.is_valid():
            new_groupchat=form.save(commit=False)
            new_groupchat.admin=request.user
            new_groupchat.save()
            new_groupchat.members.add(request.user)
            return redirect('chatroom', new_groupchat.group_name)
        
    context={
        'form':form
    }
    return render(request,'chat/create_groupchat.html',context)

@login_required
def chatroom_edit_view(request,chatroom_name):
    chat_group=get_object_or_404(ChatGroup, group_name=chatroom_name)
    if request.user!=chat_group.admin:
        raise_Http404()
        
    form=ChatRoomEditForm(instance=chat_group)
    
    if request.method=='POST':
        form=ChatRoomEditForm(request.POST,instance=chat_group)
        if form.is_valid():
            form.save()
            
            remove_members=request.POST.getlist('remove_members')
            for member_id in remove_members:
                member=User.objects.get(id=member_id)
                chat_group.members.remove(member)
                
            return redirect('chatroom', chatroom_name)
        
        context={
            'form':form,
            'chat_group':chat_group
        } 
        return render(request,'chat/chatroom_edit.html',context)
    
def chat_file_upload(request,chatroom_name):
    chat_group=get_object_or_404(ChatGroup,group_name=chatroom_name)
    
    if request.htmx and request.FILES:
        file=request.FILEES['file']
        message=GroupMessage.objects.create(
            file=file,
            author=request.user,
            group=chat_group,
        )
        channel_layer=get_channel_layer()
        event={
            'type':'message_handler',
            'message_id':message.id,
        }
        async_to_sync(channel_layer.group_send)(
            chatroom_name,event
        )
    return HttpResponse()

