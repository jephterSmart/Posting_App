import React, { Component, Fragment } from 'react';
import openSocket from 'socket.io-client';

import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: true,
    editLoading: false
  };
  
  componentDidMount() {
    fetch('https://uzezijephter-restapi.herokuapp.com/feed/status',{
      headers:{
        Authorization: 'Bearer '+this.props.token
      }
    })
      .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch user status.');
        }
        return res.json();
      })
      .then(resData => {
        this.setState({ status: resData.status ,postPage:1});
      })
      .catch(this.catchError);

    this.loadPosts();
    const socket = openSocket('https://uzezijephter-restapi.herokuapp.com');
    socket.on('posts',data => {
      if(data.action === 'create')
      this.addPost(data.post)
      else if(data.action === 'update')
      this.updatePost(data.post)
      else if(data.action === 'delete')
      this.loadPosts()
    })
  }
  
 addPost = post => {
    this.setState(prevState => {
      const updatedPosts = [...prevState.posts]
      if(prevState.postPage === 1){
        if(prevState.posts.length >= 2){
        updatedPosts.pop()
        }
        updatedPosts.unshift(post);
      }
      return {
        posts:updatedPosts,
        totalPosts:prevState.totalPosts + 1
      }
      
    })
    
 }
updatePost = post => {
this.setState(prevState => {
  const updatedPosts = [...prevState.posts];
  const updatePostIndex = updatedPosts.findIndex(pst => pst._id === post._id);
  if(updatePostIndex > -1){
    updatedPosts[updatePostIndex] = post;
  }
  return {
    posts: updatedPosts
  }
})
}

  loadPosts = direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage || 1;
    if (direction === 'next') {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === 'previous') {
      page--;
      this.setState({ postPage: page });
    }
    fetch('https://uzezijephter-restapi.herokuapp.com/feed/posts?page='+ page,{
      headers:{
        Authorization: 'Bearer '+this.props.token
      }
    })
      .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch posts.');
        }
        return res.json();
      })
      .then(resData => {
        this.setState({
          posts: resData.posts.map(post => {
            return {
              ...post,
              imagePath: post.imageUrl
            };
          }),
          totalPosts: resData.totalItems,
          postsLoading: false
        });
        return page;
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = event => {
    event.preventDefault();
    fetch('https://uzezijephter-restapi.herokuapp.com/feed/status',{
      headers:{
        Authorization: 'Bearer '+this.props.token,
        'Content-Type':'application/json'
      },
      method:"POST",
      body:JSON.stringify({
        status:this.state.status
      })
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error("Can't update status!");
        }
        return res.json();
      })
      .then(resData => {
        console.log(resData);
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = postData => {
    this.setState({
      editLoading: true
    });
    const formData = new FormData();
    formData.append('title', postData.title);
    formData.append('content', postData.content);
    formData.append('image', postData.image);
    let url = 'https://uzezijephter-restapi.herokuapp.com/feed/post';
    let method = 'POST';
    if (this.state.editPost) {
      url = 'https://uzezijephter-restapi.herokuapp.com/feed/post/' + this.state.editPost._id;
      method = 'PUT';
    }

    fetch(url, {
      method: method,
      body: formData,
      headers:{
        Authorization: 'Bearer '+this.props.token
      }
    })
      .then(res => {
        if (res.status === 403) {
          throw new Error('You are not authorized to update');
        }
        if (res.status !== 200 && res.status !== 201) {
          throw new Error('Creating or editing a post failed!');
        }
        
        return res.json();
      })
      .then(resData => {
        console.log(resData);
        // const post = {
        //   _id: resData.post._id,
        //   title: resData.post.title,
        //   content: resData.post.content,
        //   creator: resData.post.creator,
        //   createdAt: resData.post.createdAt
        // };
        this.setState( {
            isEditing: false,
            editPost: null,
            editLoading: false,
        });
        this.loadPosts()
      })
      .catch(err => {
        console.log(err);
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err
        });
      });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = postId => {
    this.setState({ postsLoading: true });
    fetch('https://uzezijephter-restapi.herokuapp.com/feed/post/' + postId,{
      method:'DELETE',
      headers:{
        Authorization: 'Bearer '+this.props.token
      }
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error('Deleting a post failed!');
        }
        return res.json();
      })
      .then(resData => {
        this.setState({ postsLoading: false });
       this.loadPosts()
      })
      .catch(err => {
        console.log(err);
      
        this.setState({ postsLoading: false });
        this.catchError(err)
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = error => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: 'center' }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, 'previous')}
              onNext={this.loadPosts.bind(this, 'next')}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map(post => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator.name}
                  date={new Date(post.createdAt).toLocaleDateString('en-US')}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  isAuth = {this.props.userId === post.creator._id.toString()}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={this.deletePostHandler.bind(this, post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
